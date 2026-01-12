import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, 
  Users, 
  Calendar, 
  DollarSign, 
  Share2, 
  Check, 
  Clock,
  AlertCircle,
  ChevronRight,
  Copy,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { StatusBadge } from "@/components/StatusBadge";
import { ReputationBadge } from "@/components/ReputationBadge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/types";

// Mock data
const mockSANG = {
  id: "1",
  name: "SANG Familia Pérez",
  contributionAmount: 5000,
  frequency: "Mensual",
  numberOfParticipants: 10,
  startDate: new Date("2024-01-15"),
  status: "active" as const,
  inviteCode: "SANG2024",
  currentTurn: 3,
  organizerId: "1",
};

const mockMembers = [
  { id: "1", name: "Juan Pérez", turn: 1, status: "paid" as PaymentStatus, reputation: 100, isOrganizer: true },
  { id: "2", name: "María García", turn: 2, status: "paid" as PaymentStatus, reputation: 95 },
  { id: "3", name: "Carlos Rodríguez", turn: 3, status: "pending" as PaymentStatus, reputation: 88, isCurrentTurn: true },
  { id: "4", name: "Ana Martínez", turn: 4, status: "pending" as PaymentStatus, reputation: 92 },
  { id: "5", name: "Pedro López", turn: 5, status: "pending" as PaymentStatus, reputation: 100 },
  { id: "6", name: "Lucía Fernández", turn: 6, status: "pending" as PaymentStatus, reputation: 85 },
  { id: "7", name: "Miguel Santos", turn: 7, status: "pending" as PaymentStatus, reputation: 78 },
  { id: "8", name: "Carmen Díaz", turn: 8, status: "pending" as PaymentStatus, reputation: 100 },
  { id: "9", name: "José Ramírez", turn: 9, status: "pending" as PaymentStatus, reputation: 90 },
  { id: "10", name: "Rosa Herrera", turn: 10, status: "pending" as PaymentStatus, reputation: 95 },
];

export default function SANGDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"timeline" | "members">("timeline");
  const isOrganizer = true; // Mock - would come from auth context

  const handleCopyCode = () => {
    navigator.clipboard.writeText(mockSANG.inviteCode);
    toast({
      title: "Código copiado",
      description: "El código de invitación ha sido copiado al portapapeles.",
    });
  };

  const handleMarkPayment = (memberId: string) => {
    toast({
      title: "Pago registrado",
      description: "El pago ha sido marcado como completado.",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case "paid":
        return <Check className="h-4 w-4 text-success" />;
      case "pending":
        return <Clock className="h-4 w-4 text-warning" />;
      case "late":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-8">
      <Header />

      <main className="container py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>

        {/* SANG Info Card */}
        <div className="bg-card rounded-2xl p-6 shadow-card mb-6 animate-slide-up">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold mb-1">{mockSANG.name}</h1>
              <StatusBadge status={mockSANG.status} size="md" />
            </div>
            <Button variant="ghost" size="icon" onClick={handleCopyCode}>
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 py-4 border-y border-border">
            <div className="text-center">
              <DollarSign className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm text-muted-foreground">Aporte</p>
              <p className="font-semibold">RD$ {mockSANG.contributionAmount.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <Calendar className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm text-muted-foreground">Frecuencia</p>
              <p className="font-semibold">{mockSANG.frequency}</p>
            </div>
            <div className="text-center">
              <Users className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm text-muted-foreground">Miembros</p>
              <p className="font-semibold">{mockSANG.numberOfParticipants}</p>
            </div>
          </div>

          {/* Invite Code */}
          <div className="mt-4 p-3 bg-accent rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Código de invitación</p>
              <p className="font-mono font-bold text-lg">{mockSANG.inviteCode}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCopyCode}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
          </div>
        </div>

        {/* Current Turn Highlight */}
        <div className="gradient-primary rounded-2xl p-5 mb-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80 text-sm">Turno Actual</p>
              <p className="text-primary-foreground text-2xl font-bold">
                #{mockSANG.currentTurn} - Carlos Rodríguez
              </p>
              <p className="text-primary-foreground/70 text-sm mt-1">
                Recibe RD$ {(mockSANG.contributionAmount * mockSANG.numberOfParticipants).toLocaleString()}
              </p>
            </div>
            <div className="h-16 w-16 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <span className="text-primary-foreground text-2xl font-bold">3</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 animate-slide-up" style={{ animationDelay: "150ms" }}>
          <Button
            variant={activeTab === "timeline" ? "default" : "ghost"}
            onClick={() => setActiveTab("timeline")}
            className="flex-1"
          >
            Línea de Tiempo
          </Button>
          <Button
            variant={activeTab === "members" ? "default" : "ghost"}
            onClick={() => setActiveTab("members")}
            className="flex-1"
          >
            Miembros
          </Button>
        </div>

        {/* Timeline View */}
        {activeTab === "timeline" && (
          <div className="space-y-3 animate-fade-in">
            {mockMembers.map((member, index) => (
              <div
                key={member.id}
                className={cn(
                  "bg-card rounded-xl p-4 shadow-card flex items-center gap-4 transition-all",
                  member.isCurrentTurn && "ring-2 ring-primary"
                )}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback
                      className={cn(
                        "text-sm font-semibold",
                        member.turn <= mockSANG.currentTurn
                          ? "bg-success/10 text-success"
                          : "bg-muted"
                      )}
                    >
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-card border-2 border-border flex items-center justify-center text-xs font-bold">
                    {member.turn}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{member.name}</p>
                    {member.isOrganizer && (
                      <span className="text-2xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        Organizador
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getStatusIcon(member.status)}
                    <span className="capitalize">{member.status === "paid" ? "Pagado" : member.status === "pending" ? "Pendiente" : "Tardío"}</span>
                  </div>
                </div>
                {member.isCurrentTurn && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                    Turno actual
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Members View */}
        {activeTab === "members" && (
          <div className="space-y-3 animate-fade-in">
            {mockMembers.map((member) => (
              <div
                key={member.id}
                className="bg-card rounded-xl p-4 shadow-card flex items-center gap-4"
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{member.name}</p>
                    {member.isOrganizer && (
                      <span className="text-2xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        Organizador
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Turno #{member.turn}</p>
                </div>
                <ReputationBadge score={member.reputation} size="sm" showTooltip={false} />
              </div>
            ))}
          </div>
        )}

        {/* Organizer Actions */}
        {isOrganizer && (
          <div className="fixed bottom-20 md:bottom-6 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
            <div className="container max-w-2xl mx-auto">
              <div className="bg-card rounded-xl p-4 shadow-elevated flex gap-3">
                <Button variant="outline" className="flex-1">
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Comprobante
                </Button>
                <Button variant="hero" className="flex-1">
                  Marcar Pagos
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
