import { Home, Users, Plus, User, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Inicio", path: "/dashboard" },
  { icon: Users, label: "SANGs", path: "/sangs" },
  { icon: Plus, label: "Crear", path: "/create-sang" },
  { icon: User, label: "Perfil", path: "/profile" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-bottom md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              data-tour={item.path === '/sangs' ? 'nav-sangs' : undefined}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200",
                isActive
                  ? "text-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", item.path === "/create-sang" && "h-6 w-6")} />
              <span className="text-2xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
