import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  LogOut,
  Shield,
  Bell,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { ReputationBadge } from "@/components/ReputationBadge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

const menuItems = [
  { icon: Bell, label: "Notificaciones", path: "/notifications" },
  { icon: Shield, label: "Seguridad", path: "/security" },
  { icon: HelpCircle, label: "Ayuda", path: "/help" },
];

export default function Profile() {
  const navigate = useNavigate();
  const { userProfile, loading } = useAuth();
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  // Fetch real activity history (SANGs organized)
  useEffect(() => {
    const fetchHistory = async () => {
      if (!userProfile?.uid) return;
      setLoadingHistory(true);
      try {
        // Get SANGs organized by user as history
        const q = query(
          collection(db, "sangs"),
          where("organizerId", "==", userProfile.uid),
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
  }, [userProfile]);


  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
        <p className="text-muted-foreground">Cargando perfil...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-medium">No se encontró información del usuario.</p>
          <Button variant="link" onClick={() => navigate("/")}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  // Safe user data object
  const user = {
    fullName: userProfile.fullName || "Usuario",
    email: userProfile.email || "",
    phoneNumber: "No registrado", // Placeholder
    reputationScore: userProfile.reputationScore || 100,
    createdAt: userProfile.createdAt && userProfile.createdAt.toDate ? userProfile.createdAt.toDate() : new Date(),
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-8">
      <Header user={userProfile as any} onLogout={handleLogout} />

      <main className="container py-6 max-w-lg mx-auto">
        {/* Profile Header */}
        <div className="text-center mb-8 animate-fade-in">
          <Avatar className="h-24 w-24 mx-auto mb-4 ring-4 ring-accent">
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold">{user.fullName}</h1>
          <p className="text-muted-foreground">{user.email}</p>
          <div className="mt-3">
            <ReputationBadge score={user.reputationScore} size="lg" />
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
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nombre completo</p>
                <p className="font-medium">{user.fullName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Correo electrónico</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Teléfono</p>
                <p className="font-medium">{user.phoneNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Miembro desde</p>
                <p className="font-medium">
                  {user.createdAt.toLocaleDateString("es-DO", { year: "numeric", month: "long" })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity History (Real) */}
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
