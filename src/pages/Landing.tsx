import { ArrowRight, Shield, Users, TrendingUp, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Users,
    title: "Organiza tu SANG",
    description: "Crea y gestiona tus grupos de ahorro con total transparencia",
  },
  {
    icon: Shield,
    title: "Reputación Confiable",
    description: "Sistema de puntuación que protege a todos los miembros",
  },
  {
    icon: TrendingUp,
    title: "Seguimiento Claro",
    description: "Visualiza pagos, turnos y próximas fechas en tiempo real",
  },
];

const benefits = [
  "Sin manejo directo de dinero",
  "Recordatorios automáticos",
  "Historial completo de pagos",
  "Invita miembros fácilmente",
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">S</span>
            </div>
            <span className="font-bold text-xl tracking-tight">TodosPonen</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/login")}>
              Iniciar Sesión
            </Button>
            <Button variant="hero" onClick={() => navigate("/register")}>
              Comenzar
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="container py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            La evolución digital del SANG tradicional
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Ahorra en comunidad,
            <br />
            <span className="text-primary">con confianza digital</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            TodosPonen moderniza la tradición dominicana del ahorro grupal.
            Organiza, rastrea y completa tus SANGs con transparencia total.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="xl" variant="hero" onClick={() => navigate("/register")}>
              Crear mi primer SANG
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="xl" variant="outline" onClick={() => navigate("/login")}>
              Ya tengo cuenta
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="container py-16">
        <div className="bg-gradient-to-br from-accent to-background rounded-3xl p-8 md:p-12">
          <div className="max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              Todo lo que necesitas para tu SANG
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success shrink-0" />
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 pb-24">
        <div className="gradient-primary rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            ¿Listo para modernizar tu SANG?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Únete a la comunidad que está transformando el ahorro tradicional dominicano.
          </p>
          <Button
            size="xl"
            variant="secondary"
            onClick={() => navigate("/register")}
          >
            Comenzar Gratis
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">S</span>
              </div>
              <span className="font-bold">TodosPonen</span>
            </div>
            <p className="text-sm text-muted-foreground">
              TodosPonen no es una institución financiera. No manejamos dinero directamente.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
