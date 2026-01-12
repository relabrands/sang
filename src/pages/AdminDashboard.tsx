import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Activity,
  BarChart3,
  UserCheck,
  Shield,
  ChevronRight
} from "lucide-react";
import { Header } from "@/components/Header";
import { DashboardCard } from "@/components/DashboardCard";
import { ReputationBadge } from "@/components/ReputationBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, where, getCountFromServer } from "firebase/firestore";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { userProfile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "sangs" | "payments">("overview");

  // Real Data State
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSangs: 0,
    completedSangs: 0,
    monthlyVolume: 0,
    latePaymentRatio: 0,
    averageReputation: 100,
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentSangs, setRecentSangs] = useState<any[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Counts
        const usersColl = collection(db, "users");
        const sangsColl = collection(db, "sangs");

        const usersSnapshot = await getCountFromServer(usersColl);
        const activeSangsSnapshot = await getCountFromServer(query(sangsColl, where("status", "==", "active")));

        setStats(prev => ({
          ...prev,
          totalUsers: usersSnapshot.data().count,
          activeSangs: activeSangsSnapshot.data().count
        }));

        // 2. Recent Users
        const recentUsersQuery = query(usersColl, orderBy("createdAt", "desc"), limit(5));
        const recentUsersSnap = await getDocs(recentUsersQuery);
        const users = recentUsersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecentUsers(users);

        // 3. Recent SANGs
        const recentSangsQuery = query(sangsColl, orderBy("createdAt", "desc"), limit(5));
        const recentSangsSnap = await getDocs(recentSangsQuery);
        const sangs = recentSangsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecentSangs(sangs);

      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchData();
  }, []);

  const getInitials = (name: string) => {
    return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase() : "U";
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  if (authLoading || loadingConfig) {
    return <div className="min-h-screen flex items-center justify-center">Cargando panel de administración...</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-8">
      <Header user={userProfile as any} onLogout={handleLogout} />

      <main className="container py-6">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Panel de Administración</span>
          </div>
          <h1 className="text-2xl font-bold">Dashboard Admin</h1>
          <p className="text-muted-foreground">Vista general de la plataforma SANG RD</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {[
            { value: "overview", label: "Resumen" },
            { value: "users", label: "Usuarios" },
            { value: "sangs", label: "SANGs" },
            { value: "payments", label: "Pagos" },
          ].map((tab) => (
            <Button
              key={tab.value}
              variant={activeTab === tab.value ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.value as typeof activeTab)}
              className="shrink-0"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-slide-up">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <DashboardCard
                title="Usuarios Totales"
                value={stats.totalUsers.toLocaleString()}
                icon={Users}
              />
              <DashboardCard
                title="SANGs Activos"
                value={stats.activeSangs.toString()}
                icon={Activity}
              />
              <DashboardCard
                title="SANGs Completados"
                value={stats.completedSangs.toString()}
                icon={UserCheck}
              />
              <DashboardCard
                title="Volumen Mensual"
                value={`RD$ ${(stats.monthlyVolume / 1000000).toFixed(1)}M`}
                icon={DollarSign}
                variant="primary"
              />
              <DashboardCard
                title="Pagos Tardíos"
                value={`${stats.latePaymentRatio}%`}
                icon={AlertTriangle}
                variant="warning"
              />
              <DashboardCard
                title="Reputación Promedio"
                value={stats.averageReputation}
                icon={BarChart3}
              />
            </div>

            {/* Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Users */}
              <div className="bg-card rounded-2xl p-5 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Usuarios Recientes</h2>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("users")}>
                    Ver todos
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="space-y-3">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 py-2">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-accent text-accent-foreground text-sm">
                          {getInitials(user.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <ReputationBadge score={user.reputationScore || 100} size="sm" showTooltip={false} />
                    </div>
                  ))}
                  {recentUsers.length === 0 && <p className="text-sm text-muted-foreground">No hay usuarios recientes.</p>}
                </div>
              </div>

              {/* SANGs List */}
              <div className="bg-card rounded-2xl p-5 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">SANGs Recientes</h2>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("sangs")}>
                    Ver todos
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="space-y-3">
                  {recentSangs.map((sang) => (
                    <div key={sang.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{sang.name}</p>
                        <div className="flex gap-2">
                          <StatusBadge status={sang.status} />
                          <span className="text-xs text-muted-foreground mt-1">
                            {sang.numberOfParticipants} miembros
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">RD$ {sang.contributionAmount}</p>
                        <p className="text-xs text-muted-foreground">{sang.frequency}</p>
                      </div>
                    </div>
                  ))}
                  {recentSangs.length === 0 && <p className="text-sm text-muted-foreground">No hay SANGs recientes.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab Placeholder */}
        {activeTab === "users" && (
          <div className="text-center py-10">
            <p>Lista completa de usuarios (Implementación futura)</p>
            <Button variant="link" onClick={() => setActiveTab("overview")}>Volver</Button>
          </div>
        )}
        {/* SANGs Tab Placeholder */}
        {activeTab === "sangs" && (
          <div className="text-center py-10">
            <p>Lista completa de SANGs (Implementación futura)</p>
            <Button variant="link" onClick={() => setActiveTab("overview")}>Volver</Button>
          </div>
        )}
      </main>
    </div>
  );
}
