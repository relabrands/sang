import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { SANGCard } from "@/components/SANGCard";
import type { SANG, SANGStatus } from "@/types";

// Mock data
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
  {
    id: "3",
    name: "SANG Vecinos",
    contributionAmount: 3000,
    frequency: "monthly",
    numberOfParticipants: 12,
    startDate: new Date("2023-06-01"),
    turnAssignment: "random",
    organizerId: "3",
    status: "completed",
    inviteCode: "VEC456",
    createdAt: new Date(),
    currentTurn: 12,
  },
  {
    id: "4",
    name: "SANG Amigos",
    contributionAmount: 10000,
    frequency: "monthly",
    numberOfParticipants: 6,
    startDate: new Date("2024-03-01"),
    turnAssignment: "random",
    organizerId: "1",
    status: "pending",
    inviteCode: "AMG321",
    createdAt: new Date(),
    currentTurn: 0,
  },
];

const mockUser = {
  fullName: "Juan Pérez",
  role: "user" as const,
};

const statusFilters: { value: SANGStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "pending", label: "Pendientes" },
  { value: "completed", label: "Completados" },
];

export default function SANGList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<SANGStatus | "all">("all");
  const [sangs] = useState<SANG[]>(mockSangs);

  const filteredSangs = sangs.filter((sang) => {
    if (filter === "all") return true;
    return sang.status === filter;
  });

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-8">
      <Header user={mockUser} />

      <main className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold">Mis SANGs</h1>
            <p className="text-muted-foreground">{sangs.length} grupos en total</p>
          </div>
          <Button variant="hero" onClick={() => navigate("/create-sang")}>
            <Plus className="h-5 w-5 mr-2" />
            Crear
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide animate-slide-up">
          {statusFilters.map((status) => (
            <Button
              key={status.value}
              variant={filter === status.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status.value)}
              className="shrink-0"
            >
              {status.label}
            </Button>
          ))}
        </div>

        {/* SANG List */}
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
          {filteredSangs.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-20 w-20 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
                <Filter className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No hay SANGs</h3>
              <p className="text-muted-foreground text-sm mb-4">
                No tienes SANGs {filter !== "all" && `con estado "${statusFilters.find(s => s.value === filter)?.label}"`}
              </p>
              <Button variant="outline" onClick={() => setFilter("all")}>
                Ver todos
              </Button>
            </div>
          ) : (
            filteredSangs.map((sang) => (
              <SANGCard key={sang.id} sang={sang} userTurn={3} />
            ))
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
