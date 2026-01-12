import { Star, TrendingUp, TrendingDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReputationBadgeProps {
  score: number;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ReputationBadge({ score, showTooltip = true, size = "md" }: ReputationBadgeProps) {
  const getScoreColor = () => {
    if (score >= 90) return "text-success bg-success/10";
    if (score >= 70) return "text-warning bg-warning/10";
    return "text-destructive bg-destructive/10";
  };

  const getScoreIcon = () => {
    if (score >= 90) return <TrendingUp className="h-3 w-3" />;
    if (score >= 70) return <Star className="h-3 w-3" />;
    return <TrendingDown className="h-3 w-3" />;
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  const badge = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        getScoreColor(),
        sizeClasses[size]
      )}
    >
      {getScoreIcon()}
      <span>{score}</span>
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1.5 cursor-help">
            {badge}
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium mb-1">Puntuación de Reputación</p>
          <p className="text-muted-foreground text-xs">
            Tu puntuación refleja tu historial de pagos. Pagos puntuales mantienen tu reputación alta.
            Los pagos tardíos (-5) o perdidos (-15) reducen tu puntuación.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
