import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Calendar,
  DollarSign,
  Share2,
  Check,
  Clock,
  AlertCircle,
  Copy,
  Upload,
  Shuffle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { StatusBadge } from "@/components/StatusBadge";
import { ReputationBadge } from "@/components/ReputationBadge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { PaymentStatus, SANG } from "@/types";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, updateDoc, setDoc, query, orderBy, where, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

export default function SANGDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"timeline" | "members">("timeline");

  const [sang, setSang] = useState<SANG | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizerName, setOrganizerName] = useState("");
  const [isRandomizing, setIsRandomizing] = useState(false);

  // Fetch SANG and Members
  useEffect(() => {
    if (!id || !currentUser) return;

    const fetchData = async () => {
      try {
        // 1. Fetch SANG Details
        const sangDoc = await getDoc(doc(db, "sangs", id));
        if (!sangDoc.exists()) {
          toast({ title: "Error", description: "SANG no encontrado", variant: "destructive" });
          navigate("/dashboard");
          return;
        }
        const sangData = { id: sangDoc.id, ...sangDoc.data() } as SANG;

        // Convert Timestamps
        if ((sangData.startDate as any)?.toDate) {
          sangData.startDate = (sangData.startDate as any).toDate();
        } else {
          sangData.startDate = new Date(sangData.startDate);
        }

        setSang(sangData);

        // 2. Fetch Members
        // We need member details (names), so we'll fetch the subcollection and then the user profiles
        const membersSnapshot = await getDocs(query(collection(db, `sangs/${id}/members`), orderBy("turnNumber", "asc")));
        const membersData = await Promise.all(membersSnapshot.docs.map(async (memberDoc) => {
          const mData = memberDoc.data();
          const userDoc = await getDoc(doc(db, "users", mData.userId));
          const userData = userDoc.exists() ? userDoc.data() : {};
          return {
            id: memberDoc.id, // member doc id (usually uid)
            ...mData,
            name: userData.fullName || "Usuario",
            reputation: userData.reputationScore || 100,
            isOrganizer: mData.role === 'organizer'
          };
        }));
        setMembers(membersData);

        // 3. Get Organizer Name specifically for display if needed
        if (sangData.organizerId) {
          const orgDoc = await getDoc(doc(db, "users", sangData.organizerId));
          if (orgDoc.exists()) setOrganizerName(orgDoc.data().fullName);
        }

      } catch (error) {
        console.error("Error fetching SANG details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, currentUser, navigate, toast]);

  const isOrganizer = currentUser && sang?.organizerId === currentUser.uid;

  const handleCopyCode = () => {
    if (!sang) return;
    navigator.clipboard.writeText(sang.inviteCode);
    toast({
      title: "Código copiado",
      description: "El código de invitación ha sido copiado al portapapeles.",
    });
  };

  const handleShareLink = () => {
    if (!sang) return;
    const link = `${window.location.origin}/join-sang?code=${sang.inviteCode}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Enlace copiado",
      description: "Comparte este enlace para que se unan directamente.",
    });
  };

  // Randomize Turns Logic
  const handleRandomizeTurns = async () => {
    if (!sang || !isOrganizer) return;

    // Basic validation: Check if enough members are approved/joined? 
    // For now, we assume user knows when to run it (usually when full).
    setIsRandomizing(true);
    try {
      // 1. Shuffle members
      const membersIds = members.map(m => m.id);
      const shuffled = [...membersIds].sort(() => Math.random() - 0.5);

      // 2. Update each member doc with new turn number
      const updates = shuffled.map((uid, index) => {
        const turn = index + 1;
        return updateDoc(doc(db, `sangs/${sang.id}/members`, uid), {
          turnNumber: turn
        });
      });
      await Promise.all(updates);

      // 3. Update SANG status to active? Or just turns assigned?
      // If all turns assigned, user can manually start or we set status.
      // Let's assume re-fetch will show new order.
      toast({ title: "Turnos asignados", description: "Los turnos se han mezclado aleatoriamente." });

      // Refresh page lightly (or re-fetch)
      window.location.reload();

    } catch (error) {
      console.error("Error randomizing turns:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron asignar los turnos." });
    } finally {
      setIsRandomizing(false);
    }
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case "paid": return <Check className="h-4 w-4 text-success" />;
      case "pending": return <Clock className="h-4 w-4 text-warning" />;
      case "late": return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center">Cargando detalles...</div>;
  if (!sang) return <div className="min-h-screen flex justify-center items-center">SANG no encontrado</div>;

  const currentMemberTurn = members.find(m => m.turnNumber === sang.currentTurn);

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-8">
      <Header />

      <main className="container py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>

        {/* SANG Info Card */}
        <div className="bg-card rounded-2xl p-6 shadow-card mb-6 animate-slide-up">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold mb-1">{sang.name}</h1>
              <StatusBadge status={sang.status} size="md" />
            </div>
            <Button variant="ghost" size="icon" onClick={handleShareLink}>
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 py-4 border-y border-border">
            <div className="text-center">
              <DollarSign className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm text-muted-foreground">Aporte</p>
              <p className="font-semibold">RD$ {sang.contributionAmount.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <Calendar className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm text-muted-foreground">Frecuencia</p>
              <p className="font-semibold capitalize">{sang.frequency}</p>
            </div>
            <div className="text-center">
              <Users className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm text-muted-foreground">Miembros</p>
              <p className="font-semibold">{members.length} / {sang.numberOfParticipants}</p>
            </div>
          </div>

          {/* Invite Code & Share */}
          <div className="mt-4 p-3 bg-accent rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Código de invitación</p>
              <p className="font-mono font-bold text-lg">{sang.inviteCode}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCopyCode}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </div>
          </div>

          {/* Randomize Button for Organizer */}
          {isOrganizer && sang.status === 'pending' && (
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={handleRandomizeTurns}
              disabled={isRandomizing || members.length < 2}
            >
              <Shuffle className="h-4 w-4 mr-2" />
              {isRandomizing ? "Mezclando..." : "Mezclar Turnos Aleatoriamente"}
            </Button>
          )}

        </div>

        {/* Current Turn Highlight */}
        {sang.status === 'active' && currentMemberTurn && (
          <div className="gradient-primary rounded-2xl p-5 mb-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/80 text-sm">Turno Actual</p>
                <p className="text-primary-foreground text-2xl font-bold">
                  #{sang.currentTurn} - {currentMemberTurn.name}
                </p>
                <p className="text-primary-foreground/70 text-sm mt-1">
                  Recibe RD$ {(sang.contributionAmount * sang.numberOfParticipants).toLocaleString()}
                </p>
              </div>
              <div className="h-16 w-16 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <span className="text-primary-foreground text-2xl font-bold">{sang.currentTurn}</span>
              </div>
            </div>
          </div>
        )}

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

        {/* Timeline/Member List */}
        <div className="space-y-3 animate-fade-in">
          {members.map((member) => (
            <div
              key={member.id}
              className={cn(
                "bg-card rounded-xl p-4 shadow-card flex items-center gap-4 transition-all",
                sang.currentTurn === member.turnNumber && sang.status === 'active' && "ring-2 ring-primary"
              )}
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className={cn("text-sm font-semibold bg-muted")}>
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                {member.turnNumber > 0 && (
                  <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-card border-2 border-border flex items-center justify-center text-xs font-bold">
                    {member.turnNumber}
                  </div>
                )}
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
                  {getStatusIcon(member.status || "pending")}
                  <span className="capitalize">{member.status === "paid" ? "Pagado" : "Pendiente"}</span>
                </div>
              </div>
            </div>
          ))}
          {members.length === 0 && <p className="text-center text-muted-foreground">Esperando miembros...</p>}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
