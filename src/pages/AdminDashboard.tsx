import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
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
import { cn } from "@/lib/utils";
import { collection, query, orderBy, getDocs, where, getCountFromServer, collectionGroup } from "firebase/firestore";

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

  // Lists
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentSangs, setRecentSangs] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allSangs, setAllSangs] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);

  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      let fetchedUsers: any[] = [];
      let fetchedSangs: any[] = [];

      // 1. Critical Data: Users & SANGs
      try {
        const usersColl = collection(db, "users");
        const sangsColl = collection(db, "sangs");

        // Users
        const allUsersQuery = query(usersColl, orderBy("createdAt", "desc"));
        const allUsersSnap = await getDocs(allUsersQuery);
        fetchedUsers = allUsersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // SANGs
        const allSangsQuery = query(sangsColl, orderBy("createdAt", "desc"));
        const allSangsSnap = await getDocs(allSangsQuery);
        fetchedSangs = allSangsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setAllUsers(fetchedUsers);
        setAllSangs(fetchedSangs);
        setRecentUsers(fetchedUsers.slice(0, 5));
        setRecentSangs(fetchedSangs.slice(0, 5));

        // Initial Stats (defaults)
        setStats(prev => ({
          ...prev,
          totalUsers: fetchedUsers.length,
          activeSangs: fetchedSangs.filter(s => s.status === "active").length,
          completedSangs: fetchedSangs.filter(s => s.status === "completed").length,
        }));

      } catch (error) {
        console.error("Error fetching critical admin data:", error);
      }

      // 2. Secondary Data: Global Payments (might fail due to indexes)
      try {
        if (fetchedUsers.length > 0 && fetchedSangs.length > 0) {
          const usersMap = new Map(fetchedUsers.map(u => [u.id, u]));
          const sangsMap = new Map(fetchedSangs.map(s => [s.id, s]));

          const paymentsQuery = query(
            collectionGroup(db, 'members'),
            where('paymentStatus', 'in', ['paid', 'reviewing'])
          );
          const paymentsSnap = await getDocs(paymentsQuery);

          const payments = paymentsSnap.docs.map(doc => {
            const data = doc.data();
            const sang = sangsMap.get(data.sangId);
            const user = usersMap.get(data.userId);

            return {
              id: doc.id,
              ...data,
              sangName: sang?.name || "Desconocido",
              amount: sang?.contributionAmount || 0,
              userName: user?.fullName || data.name || "Usuario",
              date: data.lastPaymentDate?.toDate ? data.lastPaymentDate.toDate() : new Date(),
              paymentStatus: data.paymentStatus
            };
          });

          payments.sort((a, b) => b.date.getTime() - a.date.getTime());
          setAllPayments(payments);

          // Calculate Volume
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          const currentMonthPayments = payments.filter(p =>
            p.paymentStatus === 'paid' && p.date >= startOfMonth
          );

          const totalVolume = currentMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

          setStats(prev => ({ ...prev, monthlyVolume: totalVolume }));
        }
      } catch (error) {
        console.error("Error fetching payments check indexes:", error);
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
          <p className="text-muted-foreground">Vista general de la plataforma TodosPonen</p>
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

        {/* Users Tab - Full List */}
        {activeTab === "users" && (
          <div className="bg-card rounded-2xl p-5 shadow-card animate-slide-up">
            <h2 className="font-semibold mb-4">Todos los Usuarios ({stats.totalUsers})</h2>
            <div className="space-y-3">
              {allUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {getInitials(user.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.fullName}</p>
                      {user.role === 'admin' && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">ADMIN</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unido el {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <ReputationBadge score={user.reputationScore || 100} showTooltip={false} />
                  <Button variant="outline" size="sm">
                    Ver perfil
                  </Button>
                </div>
              ))}
              {allUsers.length === 0 && <p className="text-center text-muted-foreground py-8">No se encontraron usuarios.</p>}
            </div>
          </div>
        )}

        {/* SANGs Tab - Full List */}
        {activeTab === "sangs" && (
          <div className="bg-card rounded-2xl p-5 shadow-card animate-slide-up">
            <h2 className="font-semibold mb-4">Todos los SANGs ({stats.activeSangs})</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-muted-foreground border-b border-border">
                    <th className="pb-3 font-medium">Nombre</th>
                    <th className="pb-3 font-medium">Miembros</th>
                    <th className="pb-3 font-medium">Estado</th>
                    <th className="pb-3 font-medium text-right">Monto</th>
                    <th className="pb-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {allSangs.map((sang) => (
                    <tr key={sang.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-4 font-medium max-w-[200px] truncate">
                        {sang.name}
                        <br />
                        <span className="text-xs text-muted-foreground font-normal">Code: {sang.inviteCode}</span>
                      </td>
                      <td className="py-4 text-muted-foreground">{sang.numberOfParticipants}</td>
                      <td className="py-4">
                        <StatusBadge status={sang.status} />
                      </td>
                      <td className="py-4 text-right font-medium">
                        RD$ {sang.contributionAmount?.toLocaleString()}
                        <span className="text-xs text-muted-foreground block">{sang.frequency}</span>
                      </td>
                      <td className="py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/sang/${sang.id}`)}
                        >
                          Ver detalles
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {allSangs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted-foreground py-8">No se encontraron SANGs.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments Tab Placeholder */}
        {activeTab === "payments" && (
          <div className="bg-card rounded-2xl p-5 shadow-card animate-slide-up">
            <h2 className="font-semibold mb-4">Historial de Pagos Global</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-muted-foreground border-b border-border">
                    <th className="pb-3 font-medium">Usuario</th>
                    <th className="pb-3 font-medium">SANG</th>
                    <th className="pb-3 font-medium">Estado</th>
                    <th className="pb-3 font-medium text-right">Monto</th>
                    <th className="pb-3 font-medium text-right">Fecha</th>
                    <th className="pb-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {allPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-4 font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{getInitials(payment.userName)}</AvatarFallback>
                          </Avatar>
                          <span>{payment.userName}</span>
                        </div>
                      </td>
                      <td className="py-4 text-sm">{payment.sangName}</td>
                      <td className="py-4">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full capitalize",
                          payment.paymentStatus === 'paid' ? "bg-success/10 text-success" :
                            payment.paymentStatus === 'reviewing' ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                        )}>
                          {payment.paymentStatus === 'paid' ? "Pagado" : "Revisando"}
                        </span>
                      </td>
                      <td className="py-4 text-right font-medium">
                        RD$ {payment.amount?.toLocaleString()}
                      </td>
                      <td className="py-4 text-right text-sm text-muted-foreground">
                        {payment.date?.toLocaleDateString()}
                      </td>
                      <td className="py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/sang/${payment.sangId}`)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {allPayments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted-foreground py-8">No hay pagos registrados aún.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
