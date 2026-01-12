import { Users, Calendar, DollarSign, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import type { SANG } from "@/types";
import { db } from "@/lib/firebase";

console.log("Firebase Project ID:", db.app.options.projectId);


interface SANGCardProps {
  sang: SANG;
  userTurn?: number;
  memberCount?: number;
}

const frequencyLabels = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
};

export function SANGCard({ sang, userTurn, memberCount }: SANGCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/sang/${sang.id}`)}
      className="w-full text-left bg-card rounded-2xl p-5 shadow-card hover:shadow-elevated transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {sang.name}
          </h3>
          <StatusBadge status={sang.status} />
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <span>RD$ {sang.contributionAmount.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{frequencyLabels[sang.frequency]}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{memberCount || sang.numberOfParticipants} miembros</span>
        </div>
        {userTurn && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Tu turno:</span>
            <span className="font-semibold text-primary">#{userTurn}</span>
          </div>
        )}
      </div>

      {sang.status === "active" && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Turno actual</span>
            <span className="font-semibold">#{sang.currentTurn} de {sang.numberOfParticipants}</span>
          </div>
        </div>
      )}
    </button>
  );
}
