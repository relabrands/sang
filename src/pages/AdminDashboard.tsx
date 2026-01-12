import { useState } from "react";
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
import { cn } from "@/lib/utils";

// Mock admin data
const mockStats = {
  totalUsers: 1247,
  activeSangs: 89,
  completedSangs: 234,
  monthlyVolume: 4500000,
  latePaymentRatio: 8.3,
  averageReputation: 87,
};

const mockRecentUsers = [
  { id: "1", name: "María García", reputation: 95, sangs: 3, status: "active" },
  { id: "2", name: "Carlos López", reputation: 72, sangs: 2, status: "flagged" },
  { id: "3", name: "Ana Martínez", reputation: 100, sangs: 5, status: "active" },
  { id: "4", name: "Pedro Santos", reputation: 45, sangs: 1, status: "suspended" },
];

const mockRecentSangs = [
  { id: "1", name: "SANG Villa Mella", members: 12, status: "active" as const, monthlyAmount: 60000 },
  { id: "2", name: "SANG Naco Business", members: 8, status: "active" as const, monthlyAmount: 80000 },
  { id: "3", name: "SANG Los Prados", members: 10, status: "pending" as const, monthlyAmount: 50000 },
];

const mockPaymentIssues = [
  { id: "1", userName: "Roberto Díaz", sangName: "SANG Villa Mella", daysLate: 5, amount: 5000 },
  { id: "2", userName: "Lucía Fernández", sangName: "SANG Naco Business", daysLate: 3, amount: 10000 },
  { id: "3", userName: "Miguel Herrera", sangName: "SANG Los Prados", daysLate: 8, amount: 5000 },
];

const mockAdminUser = {
  fullName: "Admin Principal",
  role: "admin" as const,
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "sangs" | "payments">("overview");

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-8">
      <Header user={mockAdminUser} onLogout={handleLogout} />

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
                value={mockStats.totalUsers.toLocaleString()}
                icon={Users}
                trend={{ value: 12, isPositive: true }}
              />
              <DashboardCard
                title="SANGs Activos"
                value={mockStats.activeSangs}
                icon={Activity}
                trend={{ value: 8, isPositive: true }}
              />
              <DashboardCard
                title="SANGs Completados"
                value={mockStats.completedSangs}
                icon={UserCheck}
              />
              <DashboardCard
                title="Volumen Mensual"
                value={`RD$ ${(mockStats.monthlyVolume / 1000000).toFixed(1)}M`}
                icon={DollarSign}
                variant="primary"
              />
              <DashboardCard
                title="Pagos Tardíos"
                value={`${mockStats.latePaymentRatio}%`}
                icon={AlertTriangle}
                variant="warning"
              />
              <DashboardCard
                title="Reputación Promedio"
                value={mockStats.averageReputation}
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
                  {mockRecentUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 py-2">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-accent text-accent-foreground text-sm">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.sangs} SANGs</p>
                      </div>
                      <ReputationBadge score={user.reputation} size="sm" showTooltip={false} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Issues */}
              <div className="bg-card rounded-2xl p-5 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Pagos Problemáticos</h2>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("payments")}>
                    Ver todos
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="space-y-3">
                  {mockPaymentIssues.map((issue) => (
                    <div key={issue.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{issue.userName}</p>
                        <p className="text-xs text-muted-foreground">{issue.sangName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-destructive">{issue.daysLate} días</p>
                        <p className="text-xs text-muted-foreground">RD$ {issue.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent SANGs */}
            <div className="bg-card rounded-2xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">SANGs Recientes</h2>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("sangs")}>
                  Ver todos
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-muted-foreground border-b border-border">
                      <th className="pb-3 font-medium">Nombre</th>
                      <th className="pb-3 font-medium">Miembros</th>
                      <th className="pb-3 font-medium">Estado</th>
                      <th className="pb-3 font-medium text-right">Volumen/Mes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockRecentSangs.map((sang) => (
                      <tr key={sang.id} className="border-b border-border last:border-0">
                        <td className="py-3 font-medium">{sang.name}</td>
                        <td className="py-3 text-muted-foreground">{sang.members}</td>
                        <td className="py-3">
                          <StatusBadge status={sang.status} />
                        </td>
                        <td className="py-3 text-right font-medium">
                          RD$ {sang.monthlyAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="bg-card rounded-2xl p-5 shadow-card animate-slide-up">
            <h2 className="font-semibold mb-4">Todos los Usuarios</h2>
            <div className="space-y-3">
              {mockRecentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.sangs} SANGs activos</p>
                  </div>
                  <ReputationBadge score={user.reputation} showTooltip={false} />
                  <Button variant="outline" size="sm">
                    Ver perfil
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SANGs Tab */}
        {activeTab === "sangs" && (
          <div className="bg-card rounded-2xl p-5 shadow-card animate-slide-up">
            <h2 className="font-semibold mb-4">Todos los SANGs</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-muted-foreground border-b border-border">
                    <th className="pb-3 font-medium">Nombre</th>
                    <th className="pb-3 font-medium">Miembros</th>
                    <th className="pb-3 font-medium">Estado</th>
                    <th className="pb-3 font-medium text-right">Volumen/Mes</th>
                    <th className="pb-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {mockRecentSangs.map((sang) => (
                    <tr key={sang.id} className="border-b border-border last:border-0">
                      <td className="py-4 font-medium">{sang.name}</td>
                      <td className="py-4 text-muted-foreground">{sang.members}</td>
                      <td className="py-4">
                        <StatusBadge status={sang.status} />
                      </td>
                      <td className="py-4 text-right font-medium">
                        RD$ {sang.monthlyAmount.toLocaleString()}
                      </td>
                      <td className="py-4 text-right">
                        <Button variant="outline" size="sm">
                          Ver detalles
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === "payments" && (
          <div className="bg-card rounded-2xl p-5 shadow-card animate-slide-up">
            <h2 className="font-semibold mb-4">Pagos Problemáticos</h2>
            <div className="space-y-3">
              {mockPaymentIssues.map((issue) => (
                <div key={issue.id} className="flex items-center gap-4 p-4 bg-destructive/5 rounded-xl border border-destructive/20">
                  <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{issue.userName}</p>
                    <p className="text-sm text-muted-foreground">{issue.sangName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-destructive">{issue.daysLate} días de retraso</p>
                    <p className="text-sm text-muted-foreground">RD$ {issue.amount.toLocaleString()}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Contactar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
