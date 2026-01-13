import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { SANGCard } from "@/components/SANGCard";
import type { SANG, SANGStatus } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, collectionGroup, getDoc } from "firebase/firestore";

const statusFilters: { value: SANGStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "pending", label: "Pendientes" },
  { value: "completed", label: "Completados" },
];

export default function SANGList() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState<SANGStatus | "all">("all");
  const [sangs, setSangs] = useState<SANG[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSangs = async () => {
      if (!currentUser) return;
      setLoading(true);

      const fetchedSangs: any[] = [];
      const processedSangIds = new Set();

      // 1. Organizer SANGs
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
      } catch (error) {
        console.error("Error fetching organizer SANGs:", error);
      }

      // 2. Member SANGs
      try {
        const membershipsQ = query(collectionGroup(db, 'members'), where('userId', '==', currentUser.uid));
        const membershipSnap = await getDocs(membershipsQ);

        const membershipPromises = membershipSnap.docs.map(async (memDoc) => {
          const sangDocRef = memDoc.ref.parent.parent;

          if (sangDocRef) {
            if (!processedSangIds.has(sangDocRef.id)) {
              try {
                const sangSnap = await getDoc(sangDocRef);
                if (sangSnap.exists()) {
                  processedSangIds.add(sangSnap.id);
                  return { id: sangSnap.id, ...sangSnap.data() };
                }
              } catch (e) {
                console.error("Error fetching single SANG detail:", e);
              }
            }
          }
          return null;
        });

        const results = await Promise.all(membershipPromises);
        results.forEach(res => { if (res) fetchedSangs.push(res); });

      } catch (error) {
        console.error("Error fetching member SANGs:", error);
      }

      // Final Processing
      try {
        const finalSangs = fetchedSangs.map(s => ({
          ...s,
          startDate: s.startDate?.toDate ? s.startDate.toDate() : new Date(s.startDate || Date.now()),
          createdAt: s.createdAt?.toDate ? s.createdAt.toDate() : new Date()
        })) as SANG[];

        finalSangs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setSangs(finalSangs);
      } catch (e) {
        console.error("Error processing SANGs:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchSangs();
  }, [currentUser]);

  const filteredSangs = sangs.filter((sang) => {
    if (filter === "all") return true;
    return sang.status === filter;
  });

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-8">
      <Header />

      <main className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold">Mis SANGs</h1>
            <p className="text-muted-foreground">
              {loading ? "Cargando..." : `${sangs.length} grupos en total`}
            </p>
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
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
              <p className="text-muted-foreground">Buscando tus grupos...</p>
            </div>
          ) : filteredSangs.length === 0 ? (
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
              {/* <div className="mt-8 p-4 bg-muted/50 rounded text-xs text-muted-foreground font-mono">
                Debug ID: {currentUser?.uid}
              </div> */}
            </div>
          ) : (
            filteredSangs.map((sang) => (
              <SANGCard key={sang.id} sang={sang} userTurn={0} memberCount={sang.numberOfParticipants} />
            ))
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
