import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, 
  Users, 
  Calendar, 
  DollarSign,
  ArrowRight,
  Bell,
  TrendingUp
} from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { DashboardCard } from "@/components/DashboardCard";
import { ReputationBadge } from "@/components/ReputationBadge";
import { SANGCard } from "@/components/SANGCard";
import { Button } from "@/components/ui/button";
import type { SANG, User } from "@/types";

// Mock data - will be replaced with real data
const mockUser: User = {
  id: "1",
  email: "juan@example.com",
  fullName: "Juan Pérez",
  phoneNumber: "809-555-1234",
  role: "user",
  reputationScore: 95,
  createdAt: new Date(),
};

const mockSangs: SANG[] = [
  {
    id: "1",
    name: "SANG Familia Pérez",
    contributionAmount: 5000,
    frequency: "monthly",
    numberOfParticipants: 10,
    startDate: new Date("2024-01-15"),
    turnAssignment: "random",
    organizerId: "1",
    status: "active",
    inviteCode: "ABC123",
    createdAt: new Date(),
    currentTurn: 3,
  },
  {
    id: "2",
    name: "SANG Oficina",
    contributionAmount: 2500,
    frequency: "biweekly",
    numberOfParticipants: 8,
    startDate: new Date("2024-02-01"),
    turnAssignment: "manual",
    organizerId: "2",
    status: "active",
    inviteCode: "XYZ789",
    createdAt: new Date(),
    currentTurn: 5,
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user] = useState<User>(mockUser);
  const [sangs] = useState<SANG[]>(mockSangs);

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-8">
      <Header user={user} onLogout={handleLogout} />

      <main className="container py-6 space-y-6">
        {/* Welcome Section */}
        <section className="animate-fade-in">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">
                ¡Hola, {user.fullName.split(" ")[0]}! 👋
              </h1>
              <p className="text-muted-foreground">
                Bienvenido de vuelta a SANG RD
              </p>
            </div>
            <ReputationBadge score={user.reputationScore} />
          </div>
        </section>

        {/* Quick Stats */}
        <section className="grid grid-cols-2 gap-4 animate-slide-up">
          <DashboardCard
            title="SANGs Activos"
            value={sangs.filter((s) => s.status === "active").length}
            icon={Users}
          />
          <DashboardCard
            title="Próximo Pago"
            value="RD$ 5,000"
            subtitle="En 3 días"
            icon={Calendar}
            variant="warning"
          />
        </section>

        {/* Upcoming Payment Alert */}
        <section className="bg-accent rounded-2xl p-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Recordatorio de Pago</p>
              <p className="text-xs text-muted-foreground">
                SANG Familia Pérez - Vence el 15 de Enero
              </p>
            </div>
            <Button size="sm" variant="ghost">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* Next Payout */}
        <section className="animate-slide-up" style={{ animationDelay: "150ms" }}>
          <DashboardCard
            title="Tu Próximo Cobro"
            value="RD$ 50,000"
            subtitle="SANG Familia Pérez - Turno #5 (Febrero)"
            icon={TrendingUp}
            variant="primary"
          />
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate("/create-sang")}
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <span className="font-medium">Crear SANG</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate("/join-sang")}
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <span className="font-medium">Unirme a SANG</span>
          </Button>
        </section>

        {/* Active SANGs */}
        <section className="animate-slide-up" style={{ animationDelay: "250ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Mis SANGs</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/sangs")}>
              Ver todos
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-4">
            {sangs.map((sang) => (
              <SANGCard key={sang.id} sang={sang} userTurn={3} />
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
