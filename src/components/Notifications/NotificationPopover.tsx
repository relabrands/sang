import { useState, useEffect } from "react";
import { Bell, BellOff, CheckCircle2, Info, AlertTriangle, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { doc, updateDoc, collection, query, orderBy, onSnapshot, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NotificationItem {
    id: string;
    title: string;
    body: string;
    type: 'info' | 'success' | 'warning' | 'error';
    createdAt: any;
    read: boolean;
}

export function NotificationPopover() {
    const { toast } = useToast();
    const { currentUser, userProfile } = useAuth();
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (Notification.permission === "granted" && userProfile?.fcmToken) {
            setEnabled(true);
        }
    }, [userProfile]);

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, "users", currentUser.uid, "notifications"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as NotificationItem[];
            setNotifications(notifs);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Listen for foreground messages
    useEffect(() => {
        import("firebase/messaging").then(({ onMessage }) => {
            onMessage(messaging, (payload) => {
                console.log("Foreground message received:", payload);
                toast({
                    title: payload.notification?.title || "Nueva notificación",
                    description: payload.notification?.body,
                    duration: 5000,
                });
                // Optionally refresh notifications or let Firestore snapshot handle it
            });
        });
    }, [toast]);

    const handleToggle = async (checked: boolean) => {
        if (!currentUser) return;
        setLoading(true);

        try {
            if (checked) {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    // Use env var as requested
                    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

                    if (!vapidKey) {
                        toast({ variant: "destructive", title: "Error de configuración", description: "Falta la clave VAPID." });
                        return;
                    }

                    const token = await getToken(messaging, { vapidKey });

                    if (token) {
                        await updateDoc(doc(db, "users", currentUser.uid), { fcmToken: token });
                        setEnabled(true);
                        toast({ title: "Notificaciones activadas" });
                    }
                } else {
                    toast({ variant: "destructive", title: "Permiso denegado", description: "Habilita las notificaciones en tu navegador." });
                    setEnabled(false);
                }
            } else {
                await updateDoc(doc(db, "users", currentUser.uid), { fcmToken: null });
                setEnabled(false);
                toast({ title: "Notificaciones desactivadas" });
            }
        } catch (error) {
            console.error("Error toggling notifications", error);
            // Check for specific error message
            if (error instanceof Error && error.message.includes("applicationServerKey")) {
                toast({ variant: "destructive", title: "Error Técnico", description: "Clave de servidor inválida. Contacta soporte." });
            } else {
                toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la configuración." });
            }
            setEnabled(false);
        } finally {
            setLoading(false);
        }
    };

    const clearAll = async () => {
        if (!currentUser || notifications.length === 0) return;

        const batch = writeBatch(db);
        notifications.forEach(n => {
            batch.delete(doc(db, "users", currentUser!.uid, "notifications", n.id));
        });
        await batch.commit();
        toast({ title: "Historial borrado" });
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case 'error': return <AlertTriangle className="h-4 w-4 text-destructive" />;
            default: return <Info className="h-4 w-4 text-primary" />;
        }
    };

    const unreadCount = notifications.length; // Simplified for now, real logic could track 'read' field

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" data-tour="header-notifications">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold leading-none">Notificaciones</h4>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={enabled}
                            onCheckedChange={handleToggle}
                            disabled={loading}
                            className="scale-75"
                        />
                        {notifications.length > 0 && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={clearAll} title="Borrar todo">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-8 text-center text-muted-foreground/50">
                            <BellOff className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">Sin notificaciones</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div key={notification.id} className="flex gap-3 p-4 hover:bg-muted/50 transition-colors">
                                    <div className="mt-0.5 shrink-0">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{notification.title}</p>
                                        <p className="text-xs text-muted-foreground">{notification.body}</p>
                                        <p className="text-[10px] text-muted-foreground pt-1">
                                            {notification.createdAt ? format(notification.createdAt.toDate(), "d MMM, h:mm a", { locale: es }) : "Ahora"}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
