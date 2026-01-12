import { cn } from "@/lib/utils";
import type { SANGStatus, PaymentStatus } from "@/types";

interface StatusBadgeProps {
  status: SANGStatus | PaymentStatus;
  size?: "sm" | "md";
}

const statusConfig = {
  // SANG statuses
  pending: { label: "Pendiente", className: "bg-warning/10 text-warning" },
  active: { label: "Activo", className: "bg-success/10 text-success" },
  completed: { label: "Completado", className: "bg-muted text-muted-foreground" },
  suspended: { label: "Suspendido", className: "bg-destructive/10 text-destructive" },
  // Payment statuses
  paid: { label: "Pagado", className: "bg-success/10 text-success" },
  late: { label: "Tardío", className: "bg-destructive/10 text-destructive" },
};

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        config.className,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      {config.label}
    </span>
  );
}
