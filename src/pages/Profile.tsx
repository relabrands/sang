import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  ChevronRight,
  LogOut,
  Shield,
  Bell,
  HelpCircle,
  Edit2,
  Save,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { ReputationBadge } from "@/components/ReputationBadge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

const menuItems = [
  { icon: Bell, label: "Notificaciones", path: "/notifications" },
  { icon: Shield, label: "Seguridad", path: "/security" },
  { icon: HelpCircle, label: "Ayuda", path: "/help" },
];

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userProfile, loading, currentUser } = useAuth();

  // Activity History State
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phoneNumber: ""
  });
  const [isSaving, setIsSaving] = useState(false);

  const getInitials = (name: string) => {
    return name
      ? name.split(" ").map((n) => n[0]).join("").toUpperCase()
      : "U";
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  // Initialize form when userProfile loads or edit mode opens
  useEffect(() => {
    if (userProfile) {
      setEditForm({
        fullName: userProfile.fullName || "",
        phoneNumber: (userProfile as any).phoneNumber || ""
      });
    } else if (currentUser) {
      // Fallback if no profile doc yet
      setEditForm({
        fullName: currentUser.displayName || "",
        phoneNumber: currentUser.phoneNumber || ""
      });
    }
  }, [userProfile, currentUser]);

  // Fetch real activity history
  useEffect(() => {
    const fetchHistory = async () => {
      // Use currentUser.uid if userProfile is missing (e.g. first login before doc creation)
      const uid = userProfile?.uid || currentUser?.uid;
      if (!uid) return;

      setLoadingHistory(true);
      try {
        // Note: This query requires a composite index: organizerId ASC, createdAt DESC
        // If index is missing, it will fail. Ensure firestore.indexes.json is deployed.
        const q = query(
          collection(db, "sangs"),
          where("organizerId", "==", uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const sangs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setActivityHistory(sangs);
      } catch (error) {
        console.error("Error fetching profile history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [userProfile, currentUser]);

  const handleSaveProfile = async () => {
    const uid = userProfile?.uid || currentUser?.uid;
    if (!uid) return;

    setIsSaving(true);
    try {
      const userRef = doc(db, "users", uid);
      const userData = {
        uid: uid,
        email: currentUser?.email,
        fullName: editForm.fullName,
        phoneNumber: editForm.phoneNumber,
        updatedAt: serverTimestamp(),
        // Only set createdAt if it doesn't exist (handled by merge, but if new doc, we want it)
        // Ideally createdAt is set on registration, but for legacy/broken users:
      };

      // Use setDoc with merge: true to create if missing or update if exists
      await setDoc(userRef, userData, { merge: true });

      toast({
        title: "Perfil actualizado",
        description: "Tu información se ha guardado correctamente.",
      });
      setIsEditing(false);
      window.location.reload();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el perfil.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
        <p className="text-muted-foreground">Cargando perfil...</p>
      </div>
    );
  }

  // Allow rendering if we have currentUser even if userProfile (firestore doc) is missing
  if (!userProfile && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-medium">No se encontró información del usuario.</p>
          <Button variant="link" onClick={() => navigate("/")}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  // Display data
  const displayName = isEditing ? editForm.fullName : (userProfile?.fullName || currentUser?.displayName || "Usuario");
  const displayEmail = userProfile?.email || currentUser?.email;
  const displayPhone = isEditing ? editForm.phoneNumber : ((userProfile as any)?.phoneNumber || "No registrado");

  // Date handling
  let displayDate = "Reciente";
  if (userProfile?.createdAt) {
    if ((userProfile.createdAt as any).toDate) {
      displayDate = (userProfile.createdAt as any).toDate().toLocaleDateString("es-DO", { year: "numeric", month: "long" });
    } else if (userProfile.createdAt instanceof Date) {
      displayDate = userProfile.createdAt.toLocaleDateString("es-DO", { year: "numeric", month: "long" });
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-8">
      <Header user={userProfile as any} onLogout={handleLogout} />

      <main className="container py-6 max-w-lg mx-auto">
        {/* Profile Header */}
        <div className="text-center mb-8 animate-fade-in relative">
          <div className="absolute right-0 top-0">
            {!isEditing ? (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-1" /> Editar
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  <X className="h-4 w-4" />
                </Button>
                <Button variant="default" size="sm" onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? "..." : <Save className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>

          <Avatar className="h-24 w-24 mx-auto mb-4 ring-4 ring-accent">
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>

          {isEditing ? (
            <div className="max-w-xs mx-auto space-y-2">
              <Input
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                placeholder="Nombre Completo"
                className="text-center text-lg font-bold"
              />
            </div>
          ) : (
            <h1 className="text-2xl font-bold">{displayName}</h1>
          )}

          <p className="text-muted-foreground">{displayEmail}</p>
          <div className="mt-3">
            <ReputationBadge score={userProfile?.reputationScore || 100} size="lg" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6 animate-slide-up">
          <div className="bg-card rounded-xl p-4 text-center shadow-card">
            <p className="text-2xl font-bold text-primary">{activityHistory.length}</p>
            <p className="text-xs text-muted-foreground">SANGs Organizados</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-card">
            <p className="text-2xl font-bold text-primary">0</p>
            <p className="text-xs text-muted-foreground">Participaciones</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-card">
            <p className="text-2xl font-bold text-success">100%</p>
            <p className="text-xs text-muted-foreground">Pagos a Tiempo</p>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-card rounded-2xl p-5 shadow-card mb-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h2 className="font-semibold mb-4">Información Personal</h2>
          <div className="space-y-4">
            {/* Name */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Nombre completo</p>
                {isEditing ? (
                  <Input
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="h-8 mt-1"
                  />
                ) : (
                  <p className="font-medium">{displayName}</p>
                )}
              </div>
            </div>

            {/* Email (Read Only) */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="opacity-70">
                <p className="text-xs text-muted-foreground">Correo electrónico</p>
                <p className="font-medium">{displayEmail}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Teléfono</p>
                {isEditing ? (
                  <Input
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                    placeholder="809-000-0000"
                    className="h-8 mt-1"
                  />
                ) : (
                  <p className="font-medium">{displayPhone}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Miembro desde</p>
                <p className="font-medium">{displayDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity History */}
        <div className="bg-card rounded-2xl p-5 shadow-card mb-6 animate-slide-up" style={{ animationDelay: "150ms" }}>
          <h2 className="font-semibold mb-4">Actividad Reciente (Organizador)</h2>
          <div className="space-y-3">
            {activityHistory.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Creación de SANG</p>
                  <p className="text-xs text-muted-foreground">{activity.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">
                    RD$ {activity.contributionAmount?.toLocaleString()}
                  </p>
                  <p className="text-2xs text-muted-foreground">
                    {activity.createdAt?.toDate ? activity.createdAt.toDate().toLocaleDateString("es-DO") : "Fecha desc."}
                  </p>
                </div>
              </div>
            ))}
            {activityHistory.length === 0 && !loadingHistory && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">Aún no has organizado SANGs.</p>
              </div>
            )}
            {loadingHistory && <p className="text-center text-sm">Cargando actividad...</p>}
          </div>
        </div>

        {/* Menu */}
        <div className="bg-card rounded-2xl shadow-card overflow-hidden mb-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
          {menuItems.map((item, index) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors",
                index !== menuItems.length - 1 && "border-b border-border"
              )}
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium">{item.label}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          size="lg"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Cerrar Sesión
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
