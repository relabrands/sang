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
import { collection, query, where, getDocs, orderBy, doc, setDoc, serverTimestamp, collectionGroup, onSnapshot, getDoc } from "firebase/firestore";
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

  // Activity & Stats State
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ organized: 0, participated: 0, timelyPaymentRate: 100 });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phoneNumber: "",
    bankName: "",
    accountType: "",
    accountNumber: "",
    cedula: ""
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
        phoneNumber: (userProfile as any).phoneNumber || "",
        bankName: userProfile.bankName || "",
        accountType: userProfile.accountType || "",
        accountNumber: userProfile.accountNumber || "",
        cedula: userProfile.cedula || ""
      });
    } else if (currentUser) {
      // Fallback if no profile doc yet
      setEditForm({
        fullName: currentUser.displayName || "",
        phoneNumber: currentUser.phoneNumber || "",
        bankName: "",
        accountType: "",
        accountNumber: "",
        cedula: ""
      });
    }
  }, [userProfile, currentUser]);

  // Fetch Real-time Activity & Stats
  useEffect(() => {
    const uid = userProfile?.uid || currentUser?.uid;
    if (!uid) return;

    setLoadingHistory(true);

    // Query all SANG memberships (Participations)
    const q = query(
      collectionGroup(db, "members"),
      where("userId", "==", uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const memberships = snapshot.docs.map(d => d.data());

      // 1. Calculate Basic Stats
      const total = memberships.length;
      const organized = memberships.filter((m: any) => m.role === 'organizer').length;

      // Calculate Payment Rate based on reputation (if available) or assume 100 for now
      // TODO: Real payment history calculation
      const rate = userProfile?.reputationScore ? Math.min(100, userProfile.reputationScore) : 100;

      setStats({ organized, participated: total, timelyPaymentRate: rate });

      // 2. Fetch SANG Details for History (Name, Amounts)
      const activityPromises = memberships.map(async (m: any) => {
        try {
          // Ensure we have a sangId
          if (!m.sangId) return m;

          const sangDoc = await getDoc(doc(db, "sangs", m.sangId));
          if (sangDoc.exists()) {
            const sData = sangDoc.data();
            return {
              ...m,
              sangName: sData.name,
              contributionAmount: sData.contributionAmount,
              // Use joinedAt from member, fallback to SANG creation
              activityDate: m.joinedAt || sData.createdAt,
              type: m.role === 'organizer' ? 'Organizó' : 'Se unió a'
            };
          }
        } catch (e) { console.error(e); }
        return { ...m, sangName: 'SANG Desconocido', type: 'Participación' };
      });

      const detailedActivity = await Promise.all(activityPromises);

      // Sort by date descending
      detailedActivity.sort((a, b) => {
        const dateA = a.activityDate?.seconds || 0;
        const dateB = b.activityDate?.seconds || 0;
        return dateB - dateA;
      });

      setActivityHistory(detailedActivity);
      setLoadingHistory(false);
    });

    return () => unsubscribe();
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
        bankName: editForm.bankName,
        accountType: editForm.accountType,
        accountNumber: editForm.accountNumber,
        cedula: editForm.cedula,
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
            {/* Old buttons removed - now using FAB */}
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
            <p className="text-2xl font-bold text-primary">{stats.organized}</p>
            <p className="text-xs text-muted-foreground">SANGs Organizados</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-card">
            <p className="text-2xl font-bold text-primary">{stats.participated}</p>
            <p className="text-xs text-muted-foreground">Participaciones</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-card" data-tour="profile-reputation">
            <p className="text-2xl font-bold text-success">{stats.timelyPaymentRate}%</p>
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

        {/* Bank Info */}
        <div className="bg-card rounded-2xl p-5 shadow-card mb-6 animate-slide-up" style={{ animationDelay: "150ms" }}>
          <h2 className="font-semibold mb-4">Información Bancaria (Obligatorio)</h2>
          <div className="space-y-4">

            {/* Cedula */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Cédula</p>
                {isEditing ? (
                  <Input
                    value={editForm.cedula}
                    onChange={(e) => setEditForm({ ...editForm, cedula: e.target.value })}
                    placeholder="000-0000000-0"
                    className="h-8 mt-1"
                  />
                ) : (
                  <p className="font-medium">{userProfile?.cedula || "No registrada"}</p>
                )}
              </div>
            </div>

            {/* Bank Name */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Banco</p>
                {isEditing ? (
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                    value={editForm.bankName}
                    onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                  >
                    <option value="">Selecciona un banco</option>
                    <option value="Banco Popular">Banco Popular</option>
                    <option value="Banreservas">Banreservas</option>
                    <option value="BHD">BHD</option>
                    <option value="Asociación Popular">Asociación Popular (APAP)</option>
                    <option value="Scotiabank">Scotiabank</option>
                    <option value="Santa Cruz">Santa Cruz</option>
                    <option value="BDI">BDI</option>
                    <option value="Vimenca">Vimenca</option>
                    <option value="Ademi">Ademi</option>
                  </select>
                ) : (
                  <p className="font-medium">{userProfile?.bankName || "No registrado"}</p>
                )}
              </div>
            </div>

            {/* Account Type */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Tipo de Cuenta</p>
                {isEditing ? (
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                    value={editForm.accountType}
                    onChange={(e) => setEditForm({ ...editForm, accountType: e.target.value })}
                  >
                    <option value="">Selecciona tipo</option>
                    <option value="Ahorros">Cuenta de Ahorros</option>
                    <option value="Corriente">Cuenta Corriente</option>
                  </select>
                ) : (
                  <p className="font-medium">{userProfile?.accountType || "No registrada"}</p>
                )}
              </div>
            </div>

            {/* Account Number */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Número de Cuenta</p>
                {isEditing ? (
                  <Input
                    value={editForm.accountNumber}
                    onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value })}
                    placeholder="000000000"
                    className="h-8 mt-1"
                  />
                ) : (
                  <p className="font-medium font-mono">{userProfile?.accountNumber || "No registrado"}</p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Activity History */}
        <div className="bg-card rounded-2xl p-5 shadow-card mb-6 animate-slide-up" style={{ animationDelay: "150ms" }}>
          <h2 className="font-semibold mb-4">Actividad Reciente</h2>
          <div className="space-y-3">
            {activityHistory.map((activity, idx) => (
              <div key={idx} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{activity.type || 'Actividad'}</p>
                  <p className="text-xs text-muted-foreground">{activity.sangName || 'SANG'}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">
                    RD$ {activity.contributionAmount?.toLocaleString()}
                  </p>
                  <p className="text-2xs text-muted-foreground">
                    {activity.activityDate?.toDate ? activity.activityDate.toDate().toLocaleDateString("es-DO") : "Fecha desc."}
                  </p>
                </div>
              </div>
            ))}
            {activityHistory.length === 0 && !loadingHistory && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">Sin actividad reciente.</p>
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

      {/* Floating Action Buttons for Edit/Save */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3">
        {!isEditing ? (
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-primary text-white hover:bg-primary/90 hover:scale-105 transition-all"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-6 w-6" />
          </Button>
        ) : (
          <>
            <Button
              size="icon"
              variant="destructive"
              className="h-12 w-12 rounded-full shadow-md opacity-90 hover:opacity-100 hover:scale-105 transition-all"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              title="Cancelar"
            >
              <X className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg bg-success text-white hover:bg-success/90 hover:scale-105 transition-all animate-bounce-subtle"
              onClick={handleSaveProfile}
              disabled={isSaving}
              title="Guardar Cambios"
            >
              {isSaving ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-6 w-6" />}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
