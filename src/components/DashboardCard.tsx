import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  variant?: "default" | "primary" | "success" | "warning";
}

export function DashboardCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  variant = "default",
}: DashboardCardProps) {
  const variantClasses = {
    default: "bg-card",
    primary: "gradient-primary text-primary-foreground",
    success: "bg-success/10",
    warning: "bg-warning/10",
  };

  return (
    <div
      className={cn(
        "rounded-2xl p-5 shadow-card transition-all duration-200 hover:shadow-elevated",
        variantClasses[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p
            className={cn(
              "text-sm font-medium",
              variant === "primary" ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "text-2xl font-bold tracking-tight",
              variant === "primary" ? "text-primary-foreground" : "text-foreground"
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p
              className={cn(
                "text-xs",
                variant === "primary" ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "rounded-xl p-2.5",
              variant === "primary"
                ? "bg-primary-foreground/20"
                : "bg-accent"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                variant === "primary" ? "text-primary-foreground" : "text-primary"
              )}
            />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          <span
            className={cn(
              "text-xs font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}
          >
            {trend.isPositive ? "+" : "-"}{trend.value}%
          </span>
          <span className="text-xs text-muted-foreground">vs mes anterior</span>
        </div>
      )}
    </div>
  );
}
