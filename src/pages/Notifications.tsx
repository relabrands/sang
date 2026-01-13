import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function Notifications() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { currentUser, userProfile } = useAuth();
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check permission state on load
        if (Notification.permission === "granted" && userProfile?.fcmToken) {
            setEnabled(true);
        }
    }, [userProfile]);

    const handleToggle = async (checked: boolean) => {
        if (!currentUser) return;
        setLoading(true);

        try {
            if (checked) {
                // Request Permission
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
                // We can't revoke browser permission via JS, but we can remove the token from DB
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

    return (
        <div className="min-h-screen bg-muted/30 pb-20 md:pb-8">
            <div className="container py-6 max-w-lg mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Notificaciones</h1>
                </div>

                <div className="bg-card rounded-2xl p-6 shadow-card space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                {enabled ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
                                <h2 className="font-semibold">Notificaciones Push</h2>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Recibe alertas sobre pagos, turnos y mensajes importantes.
                            </p>
                        </div>
                        <Switch
                            checked={enabled}
                            onCheckedChange={handleToggle}
                            disabled={loading}
                        />
                    </div>

                    <div className="bg-accent/50 rounded-xl p-4 text-sm text-muted-foreground">
                        <p>
                            Nota: Si tienes problemas para recibir notificaciones, asegúrate de que no estén bloqueadas en la configuración de sitio de tu navegador o teléfono.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
