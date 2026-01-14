import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, BellOff, CheckCircle2, Info, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { doc, updateDoc, collection, query, orderBy, onSnapshot, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface NotificationItem {
    id: string;
    title: string;
    body: string;
    type: 'info' | 'success' | 'warning' | 'error';
    createdAt: any;
    read: boolean;
}

export default function Notifications() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { currentUser, userProfile } = useAuth();
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

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

    const handleToggle = async (checked: boolean) => {
        if (!currentUser) return;
        setLoading(true);

        try {
            if (checked) {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    const token = await getToken(messaging, {
                        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
                    });

                    if (token) {
                        await updateDoc(doc(db, "users", currentUser.uid), { fcmToken: token });
                        setEnabled(true);
                        toast({ title: "Notificaciones activadas", description: "Recibirás alertas de tus SANGs." });
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
            toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la configuración." });
            setEnabled(false);
        } finally {
            setLoading(false);
        }
    };

    const clearAll = async () => {
        if (!currentUser || notifications.length === 0) return;
        if (!confirm("¿Borrar todas las notificaciones?")) return;

        const batch = writeBatch(db);
        notifications.forEach(n => {
            batch.delete(doc(db, "users", currentUser!.uid, "notifications", n.id));
        });
        await batch.commit();
        toast({ title: "Notificaciones borradas" });
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case 'error': return <AlertTriangle className="h-5 w-5 text-destructive" />;
            default: return <Info className="h-5 w-5 text-primary" />;
        }
    };

    return (
        <div className="min-h-screen bg-muted/30 pb-20 md:pb-8">
            <div className="container py-6 max-w-lg mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Notificaciones</h1>
                </div>

                <div className="bg-card rounded-2xl p-6 shadow-card space-y-6 animate-fade-in mb-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                {enabled ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
                                <h2 className="font-semibold">Push Notifications</h2>
                            </div>
                            <p className="text-xs text-muted-foreground">Alertas en tu dispositivo</p>
                        </div>
                        <Switch checked={enabled} onCheckedChange={handleToggle} disabled={loading} />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Historial</h3>
                        {notifications.length > 0 && (
                            <Button variant="ghost" size="sm" className="text-destructive text-xs h-8" onClick={clearAll}>
                                <Trash2 className="h-3 w-3 mr-1" /> Borrar todo
                            </Button>
                        )}
                    </div>

                    {notifications.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <BellOff className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>No tienes notificaciones recientes.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map((notification) => (
                                <div key={notification.id} className="bg-card p-4 rounded-xl shadow-sm border border-border/50 flex gap-4 animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="mt-1 shrink-0">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between items-start">
                                            <p className="font-medium text-sm text-foreground">{notification.title}</p>
                                            <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                                {notification.createdAt ? format(notification.createdAt.toDate(), "d MMM, h:mm a", { locale: es }) : "Ahora"}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{notification.body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
