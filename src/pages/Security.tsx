import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";

export default function Security() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { currentUser } = useAuth();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !currentUser.email) return;

        if (newPassword !== confirmPassword) {
            toast({ variant: "destructive", title: "Error", description: "Las contraseñas no coinciden." });
            return;
        }

        if (newPassword.length < 6) {
            toast({ variant: "destructive", title: "Insegura", description: "La contraseña debe tener al menos 6 caracteres." });
            return;
        }

        setLoading(true);
        try {
            // Re-authenticate first
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);

            // Update Password
            await updatePassword(currentUser, newPassword);

            toast({ title: "Contraseña actualizada", description: "Tu contraseña ha sido cambiada exitosamente." });
            navigate("/profile");
        } catch (error: any) {
            console.error("Error updating password", error);
            let msg = "No se pudo cambiar la contraseña.";
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                msg = "La contraseña actual es incorrecta.";
            }
            toast({ variant: "destructive", title: "Error", description: msg });
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
                    <h1 className="text-xl font-bold">Seguridad</h1>
                </div>

                <div className="bg-card rounded-2xl p-6 shadow-card space-y-6 animate-fade-in">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="font-semibold">Cambiar Contraseña</h2>
                            <p className="text-sm text-muted-foreground">Mantén tu cuenta segura</p>
                        </div>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="current">Contraseña Actual</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="current"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="pl-9"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new">Nueva Contraseña</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="new"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="pl-9"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm">Confirmar Nueva Contraseña</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="confirm"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="pl-9"
                                    required
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Actualizando..." : "Actualizar Contraseña"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
