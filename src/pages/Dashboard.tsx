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
import { collection, query, where, getDocs, collectionGroup, getDoc, doc, deleteDoc } from "firebase/firestore";
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
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loadingSangs, setLoadingSangs] = useState(true);
  const [upcomingPayments, setUpcomingPayments] = useState<any[]>([]);
  const [totalNextPayment, setTotalNextPayment] = useState(0);

  useEffect(() => {
    const fetchSangs = async () => {
      if (!currentUser) return;

      const fetchedSangs: any[] = [];
      const pending: any[] = [];
      const upcoming: any[] = [];
      let totalDue = 0;
      const processedSangIds = new Set();

      try {
        // 1. Organizer SANGs (Always fetch these first)
        try {
          const qOrganizer = query(
            collection(db, "sangs"),
            where("organizerId", "==", currentUser.uid)
          );
          const organizerSnapshot = await getDocs(qOrganizer);
          organizerSnapshot.docs.forEach(doc => {
            if (!processedSangIds.has(doc.id)) {
              fetchedSangs.push({ id: doc.id, ...doc.data() });
              processedSangIds.add(doc.id);
            }
          });
        } catch (e) {
          console.error("Error fetching organizer SANGs:", e);
        }

        // 2. Member SANGs (Requests & Active)
        try {
          const membershipsQ = query(collectionGroup(db, 'members'), where('userId', '==', currentUser.uid));
          const membershipSnap = await getDocs(membershipsQ);

          const memPromises = membershipSnap.docs.map(async (memDoc) => {
            const memberData = memDoc.data();
            const sangDocRef = memDoc.ref.parent.parent;
            if (!sangDocRef) return;

            if (memberData.status === 'pending') {
              // Pending Request
              try {
                const sangSnap = await getDoc(sangDocRef);
                if (sangSnap.exists()) {
                  pending.push({
                    requestId: memDoc.id,
                    sangId: sangSnap.id,
                    sangName: sangSnap.data().name,
                    ...memberData
                  });
                }
              } catch (e) { console.error("Error fetching pending sang details", e); }
            } else if (memberData.status === 'active' || !memberData.status) {
              // Active Member
              let sangData: any;

              // If already fetched (as organizer), find it
              const existing = fetchedSangs.find(s => s.id === sangDocRef.id);
              if (existing) {
                sangData = existing;
              } else if (!processedSangIds.has(sangDocRef.id)) {
                try {
                  const sangSnap = await getDoc(sangDocRef);
                  if (sangSnap.exists()) {
                    sangData = { id: sangSnap.id, ...sangSnap.data() };
                    fetchedSangs.push(sangData);
                    processedSangIds.add(sangSnap.id);
                  }
                } catch (e) { console.error("Error fetching active sang details", e); }
              }

              // Calculate Next Payment for this active member
              if (sangData && sangData.status === 'active') {
                const isPaid = memberData.paymentStatus === 'paid';
                const isReviewing = memberData.paymentStatus === 'reviewing';

                if (!isPaid && !isReviewing) {
                  // Calculate Due Date
                  const startDate = sangData.startDate?.toDate ? sangData.startDate.toDate() : new Date(sangData.startDate);
                  const currentTurn = sangData.currentTurn || 1;
                  let dueDate = new Date(startDate);

                  if (sangData.frequency === 'weekly') {
                    dueDate.setDate(startDate.getDate() + (currentTurn - 1) * 7);
                  } else if (sangData.frequency === 'biweekly') {
                    dueDate.setDate(startDate.getDate() + (currentTurn - 1) * 14);
                  } else if (sangData.frequency === 'monthly') {
                    dueDate.setMonth(startDate.getMonth() + (currentTurn - 1));
                  }

                  const amount = sangData.contributionAmount;
                  totalDue += amount;

                  upcoming.push({
                    sangId: sangData.id,
                    sangName: sangData.name,
                    amount: amount,
                    dueDate: dueDate,
                    status: memberData.paymentStatus || 'pending'
                  });
                }
              }
            }
          });
          await Promise.all(memPromises);

        } catch (e) {
          console.error("Error fetching memberships:", e);
        }

        // Process final SANGs structure
        const finalSangs = fetchedSangs.map(s => ({
          ...s,
          startDate: s.startDate?.toDate ? s.startDate.toDate() : new Date(s.startDate),
          createdAt: s.createdAt?.toDate ? s.createdAt.toDate() : new Date(),
        })) as SANG[];

        finalSangs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        // Sort upcoming payments by date
        upcoming.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

        setSangs(finalSangs);
        setPendingRequests(pending);
        setUpcomingPayments(upcoming);
        setTotalNextPayment(totalDue);

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

  const cancelRequest = async (sangId: string) => {
    try {
      if (!currentUser) return;
      await deleteDoc(doc(db, `sangs/${sangId}/members`, currentUser.uid));
      setPendingRequests(prev => prev.filter(p => p.sangId !== sangId));
    } catch (e) {
      console.error(e);
    }
  };

  if (authLoading || loadingSangs) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  const displayName = userProfile?.fullName || currentUser?.email?.split('@')[0] || "Usuario";
  const displayScore = userProfile?.reputationScore || 100;
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
            value={`RD$ ${totalNextPayment.toLocaleString()}`}
            subtitle={totalNextPayment > 0 ? `${upcomingPayments.length} pagos pendientes` : "Estás al día"}
            icon={Calendar}
            variant={totalNextPayment > 0 ? "warning" : "default"}
          />
        </section>

        {/* Upcoming Payments Detail */}
        {upcomingPayments.length > 0 && (
          <section className="animate-slide-up">
            <h2 className="text-lg font-semibold mb-3">Próximos Pagos</h2>
            <div className="space-y-3">
              {upcomingPayments.map((payment, idx) => (
                <div key={idx} className="bg-card p-4 rounded-xl shadow-sm flex items-center justify-between border-l-4 border-warning">
                  <div>
                    <p className="font-medium">{payment.sangName}</p>
                    <p className="text-xs text-muted-foreground">
                      Vence: {payment.dueDate.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">RD$ {payment.amount.toLocaleString()}</p>
                    <Button
                      size="sm"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => navigate(`/sang/${payment.sangId}`)}
                    >
                      Pagar ahora
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <section className="animate-slide-up">
            <h2 className="text-lg font-semibold mb-3">Solicitudes Enviadas</h2>
            <div className="space-y-3">
              {pendingRequests.map(req => (
                <div key={req.sangId} className="bg-card p-4 rounded-xl shadow-sm flex items-center justify-between border border-primary/20">
                  <div>
                    <p className="font-medium">{req.sangName}</p>
                    <p className="text-xs text-muted-foreground">Esperando aprobación</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => cancelRequest(req.sangId)}
                  >
                    Cancelar
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

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
