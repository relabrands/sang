import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Users,
  Calendar,
  ArrowRight,
  Bell,
  TrendingUp
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { DashboardCard } from "@/components/DashboardCard";
import { ReputationBadge } from "@/components/ReputationBadge";
import { SANGCard } from "@/components/SANGCard";
import { Button } from "@/components/ui/button";
import type { SANG, User } from "@/types";

export default function Dashboard() {
  const navigate = useNavigate();
  const { userProfile, loading: authLoading, currentUser } = useAuth();
  const [sangs, setSangs] = useState<SANG[]>([]);
  const [loadingSangs, setLoadingSangs] = useState(true);

  useEffect(() => {
    const fetchSangs = async () => {
      if (!currentUser) return;

      try {
        // Fetch SANGs where user is organizer
        // Note: Ideally we also fetch where user is a member. 
        // For now, this validates the 'Create SANG' flow working in production.
        const qOrganizer = query(
          collection(db, "sangs"),
          where("organizerId", "==", currentUser.uid)
        );

        const organizerSnapshot = await getDocs(qOrganizer);
        const fetchedSangs = organizerSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Ensure dates are converted from Timestamp if needed
          startDate: doc.data().startDate?.toDate ? doc.data().startDate.toDate() : new Date(doc.data().startDate),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
        } as SANG));

        setSangs(fetchedSangs);
      } catch (error) {
        console.error("Error fetching SANGs:", error);
      } finally {
        setLoadingSangs(false);
      }
    };

    fetchSangs();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (authLoading || loadingSangs) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  // Use userProfile data or fallbacks
  const displayName = userProfile?.fullName || currentUser?.email?.split('@')[0] || "Usuario";
  const displayScore = userProfile?.reputationScore || 100;

  // Construct a partial user object for Header if needed
  const headerUser = userProfile ? (userProfile as unknown as User) : undefined;

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-8">
      <Header user={headerUser} onLogout={handleLogout} />

      <main className="container py-6 space-y-6">
        {/* Welcome Section */}
        <section className="animate-fade-in">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">
                ¡Hola, {displayName.split(" ")[0]}! 👋
              </h1>
              <p className="text-muted-foreground">
                Bienvenido de vuelta a SANG RD
              </p>
            </div>
            <ReputationBadge score={displayScore} />
          </div>
        </section>

        {/* Quick Stats */}
        <section className="grid grid-cols-2 gap-4 animate-slide-up">
          <DashboardCard
            title="SANGs Activos"
            value={sangs.filter((s) => s.status === "active" || s.status === "pending").length}
            icon={Users}
          />
          <DashboardCard
            title="Próximo Pago"
            value="RD$ 0"
            subtitle="Sin pagos pendientes"
            icon={Calendar}
            variant="warning"
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

          {sangs.length === 0 ? (
            <div className="text-center py-10 bg-card rounded-xl border border-dashed">
              <p className="text-muted-foreground">No tienes SANGs activos.</p>
              <Button variant="link" onClick={() => navigate("/create-sang")}>Crear uno ahora</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sangs.map((sang) => (
                <SANGCard key={sang.id} sang={sang} userTurn={0} memberCount={sang.numberOfParticipants} />
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
