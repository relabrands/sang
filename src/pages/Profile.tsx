import { useState } from "react";
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

// Mock data
const mockUser = {
  id: "1",
  email: "juan@example.com",
  fullName: "Juan Pérez",
  phoneNumber: "809-555-1234",
  role: "user" as const,
  reputationScore: 95,
  createdAt: new Date("2023-06-15"),
};

const mockReputationHistory = [
  { id: "1", change: 10, reason: "SANG completado", date: new Date("2024-01-10"), sangName: "SANG Familia García" },
  { id: "2", change: -5, reason: "Pago tardío", date: new Date("2023-12-20"), sangName: "SANG Oficina" },
  { id: "3", change: 10, reason: "SANG completado", date: new Date("2023-11-15"), sangName: "SANG Amigos" },
  { id: "4", change: -5, reason: "Pago tardío", date: new Date("2023-10-05"), sangName: "SANG Familia García" },
];

const menuItems = [
  { icon: Bell, label: "Notificaciones", path: "/notifications" },
  { icon: Shield, label: "Seguridad", path: "/security" },
  { icon: HelpCircle, label: "Ayuda", path: "/help" },
];

export default function Profile() {
  const navigate = useNavigate();
  const [user] = useState(mockUser);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-8">
      <Header user={user} onLogout={handleLogout} />

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
            <p className="text-2xl font-bold text-primary">5</p>
            <p className="text-xs text-muted-foreground">SANGs Completados</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-card">
            <p className="text-2xl font-bold text-primary">2</p>
            <p className="text-xs text-muted-foreground">SANGs Activos</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-card">
            <p className="text-2xl font-bold text-success">98%</p>
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

        {/* Reputation History */}
        <div className="bg-card rounded-2xl p-5 shadow-card mb-6 animate-slide-up" style={{ animationDelay: "150ms" }}>
          <h2 className="font-semibold mb-4">Historial de Reputación</h2>
          <div className="space-y-3">
            {mockReputationHistory.map((log) => (
              <div key={log.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center",
                    log.change > 0 ? "bg-success/10" : "bg-destructive/10"
                  )}
                >
                  {log.change > 0 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{log.reason}</p>
                  <p className="text-xs text-muted-foreground">{log.sangName}</p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "font-semibold",
                      log.change > 0 ? "text-success" : "text-destructive"
                    )}
                  >
                    {log.change > 0 ? "+" : ""}{log.change}
                  </p>
                  <p className="text-2xs text-muted-foreground">
                    {log.date.toLocaleDateString("es-DO")}
                  </p>
                </div>
              </div>
            ))}
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
