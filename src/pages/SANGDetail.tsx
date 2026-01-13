import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Share2, Copy, Users, Calendar,
  DollarSign, Check, AlertCircle, Shuffle, Upload, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, onSnapshot, query, serverTimestamp, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { SANG, SANGMember } from "@/types";
import { cn } from "@/lib/utils";

export default function SANGDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, userProfile } = useAuth();

  const [sang, setSang] = useState<SANG | null>(null);
  const [members, setMembers] = useState<SANGMember[]>([]);
  const [pendingMembers, setPendingMembers] = useState<SANGMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [activeTab, setActiveTab] = useState<"timeline" | "members">("timeline");

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [targetMemberId, setTargetMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !currentUser) return;

    // 1. Listen to SANG document
    const unsubSang = onSnapshot(doc(db, "sangs", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSang({
          id: docSnap.id,
          ...data,
          startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate)
        } as SANG);
      } else {
        toast({ variant: "destructive", title: "Error", description: "SANG no encontrado" });
        navigate("/sangs");
      }
      setLoading(false);
    });

    // 2. Listen to Members Collection
    const qMembers = query(collection(db, `sangs/${id}/members`));
    const unsubMembers = onSnapshot(qMembers, (snapshot) => {
      const active: SANGMember[] = [];
      const pending: any[] = [];

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const member = { id: docSnap.id, ...data } as SANGMember;

        // Auto-fix: If name is missing, fetch from profile and update doc
        if (!member.name && member.userId) {
          getDoc(doc(db, "users", member.userId)).then(snap => {
            if (snap.exists()) {
              updateDoc(docSnap.ref, { name: snap.data().fullName || "Usuario" });
            }
          }).catch(console.error);
        }

        // Separate Active vs Pending Requests
        if (data.status === 'pending') {
          pending.push(member);
        } else {
          active.push(member);
        }
      });

      // Sort active members by turn
      active.sort((a, b) => (a.turnNumber || 999) - (b.turnNumber || 999));

      setMembers(active);
      setPendingMembers(pending);
    });

    return () => {
      unsubSang();
      unsubMembers();
    };
  }, [id, currentUser, navigate, toast]);

  const isOrganizer = currentUser && sang?.organizerId === currentUser.uid;
  const isAdmin = userProfile?.role === 'admin';

  const handleShareLink = () => {
    if (!sang) return;
    const shareText = `¡Únete a mi SANG "${sang.name}" en TodosPonen! Usa el código: ${sang.inviteCode}`;
    if (navigator.share) {
      navigator.share({ title: "Únete a mi SANG", text: shareText, url: window.location.href });
    } else {
      navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
      toast({ title: "Enlace copiado", description: "Compártelo con tus amigos" });
    }
  };

  const handleCopyCode = () => {
    if (sang) {
      navigator.clipboard.writeText(sang.inviteCode);
      toast({ title: "Código copiado", description: "Compártelo para invitar miembros" });
    }
  };

  const handleRandomizeTurns = async () => {
    if (!sang || !isOrganizer) return;
    setIsRandomizing(true);
    try {
      const turns = Array.from({ length: members.length }, (_, i) => i + 1);
      for (let i = turns.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [turns[i], turns[j]] = [turns[j], turns[i]];
      }

      const updates = members.map((member, index) =>
        updateDoc(doc(db, `sangs/${sang.id}/members`, member.id), { turnNumber: turns[index] })
      );

      if (sang.status === 'pending') {
        updates.push(updateDoc(doc(db, "sangs", sang.id), { status: 'active', currentTurn: 1 }));
      }

      await Promise.all(updates);
      toast({ title: "Turnos asignados", description: "El SANG ha comenzado." });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Falló la asignación de turnos." });
    } finally {
      setIsRandomizing(false);
    }
  };

  const handleAcceptMember = async (memberId: string) => {
    if (!sang) return;
    try {
      if (members.length >= sang.numberOfParticipants) {
        toast({ variant: "destructive", title: "Lleno", description: "El SANG está lleno." });
        return;
      }
      await updateDoc(doc(db, `sangs/${sang.id}/members`, memberId), { status: 'active', joinedAt: serverTimestamp() });
      toast({ title: "Miembro aceptado" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: "No se pudo aceptar al miembro." });
    }
  };

  const handleRejectMember = async (memberId: string) => {
    if (!sang) return;
    try {
      await deleteDoc(doc(db, `sangs/${sang.id}/members`, memberId));
      toast({ title: "Solicitud rechazada" });
    } catch (e) {
      console.error(e);
    }
  };

  // View Member Details (Bank Info)
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [viewingMember, setViewingMember] = useState(false);

  const handleViewDetails = async (userId: string) => {
    setViewingMember(true);
    try {
      const uDoc = await getDoc(doc(db, "users", userId));
      if (uDoc.exists()) {
        setSelectedMember(uDoc.data());
      } else {
        toast({ variant: "destructive", title: "Error", description: "Perfil no encontrado" });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Real File Upload Logic ---

  const triggerUpload = (memberId: string) => {
    setTargetMemberId(memberId);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetMemberId || !sang) return;

    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Archivo inválido", description: "Sube una imagen (PNG, JPG)." });
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `proofs/${sang.id}/${targetMemberId}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      await updateDoc(doc(db, `sangs/${sang.id}/members`, targetMemberId), {
        paymentStatus: "reviewing",
        paymentProofUrl: downloadURL,
        lastPaymentDate: serverTimestamp()
      });

      toast({ title: "Comprobante subido", description: "El organizador revisará tu pago." });
    } catch (error) {
      console.error("Upload failed", error);
      toast({ variant: "destructive", title: "Error al subir", description: "Verifica tu conexión." });
    } finally {
      setUploading(false);
      setTargetMemberId(null);
    }
  };

  const handleApprovePayment = async (memberId: string) => {
    try {
      await updateDoc(doc(db, `sangs/${sang!.id}/members`, memberId), {
        paymentStatus: "paid"
      });
      toast({ title: "Pago aprobado", description: "El miembro ha sido marcado como pagado." });
    } catch (e) {
      console.error(e);
    }
  };

  const getInitials = (name: string) => {
    return (name || "Usuario")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center">Cargando detalles...</div>;
  if (!sang) return <div className="min-h-screen flex justify-center items-center">SANG no encontrado</div>;

  const currentMemberTurn = members.find(m => m.turnNumber === sang.currentTurn);

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-8">
      <Header />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <main className="container py-6 max-w-2xl mx-auto">
        <div className="mb-6 animate-fade-in">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>

        {/* SANG Card Details */}
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
              <p className="text-xs md:text-sm text-muted-foreground">Aporte</p>
              <p className="font-semibold text-sm md:text-base">RD$ {sang.contributionAmount.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <Calendar className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs md:text-sm text-muted-foreground">Frecuencia</p>
              <p className="font-semibold capitalize text-sm md:text-base">{sang.frequency}</p>
            </div>
            <div className="text-center">
              <Users className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs md:text-sm text-muted-foreground">Miembros</p>
              <p className="font-semibold text-sm md:text-base">{members.length} / {sang.numberOfParticipants}</p>
            </div>
          </div>

          {sang.status === 'active' && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progreso del SANG</span>
                  <span className="font-medium">{Math.round(((sang.currentTurn - 1) / sang.numberOfParticipants) * 100)}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${((sang.currentTurn - 1) / sang.numberOfParticipants) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Turno {sang.currentTurn} de {sang.numberOfParticipants}
                </p>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Próximo Pago: {(() => {
                    const d = new Date(sang.startDate);
                    const turns = sang.currentTurn - 1;
                    if (sang.frequency === 'weekly') d.setDate(d.getDate() + (turns * 7));
                    if (sang.frequency === 'biweekly') d.setDate(d.getDate() + (turns * 14));
                    if (sang.frequency === 'monthly') d.setMonth(d.getMonth() + turns);
                    return d.toLocaleDateString("es-DO", { day: 'numeric', month: 'long', year: 'numeric' });
                  })()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Realiza tu pago antes de la fecha para mantener tu <span className="text-primary font-medium">Reputación al 100%</span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {sang.status === 'pending' && (<div className="mt-4 p-3 bg-accent rounded-xl flex items-center justify-between">
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
          </div>)}

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

        {/* Admin Robust View */}
        {isAdmin && (
          <div className="bg-destructive/5 border-2 border-destructive/20 rounded-2xl p-5 mb-6 animate-fade-in">
            {/* ... Admin content ... */}
            <p className="text-destructive font-bold">Admin View Active</p>
          </div>
        )}

        {/* Pending Requests Section */}
        {isOrganizer && pendingMembers.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-6 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-primary">Solicitudes de Unión ({pendingMembers.length})</h2>
            </div>
            <div className="space-y-3">
              {pendingMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-background rounded-xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getInitials(member.name || "")}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{member.name || "Usuario"}</p>
                      <p className="text-xs text-muted-foreground">Quiere unirse</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleRejectMember(member.id)}>
                      Rechazar
                    </Button>
                    <Button size="sm" className="bg-success hover:bg-success/90 text-white" onClick={() => handleAcceptMember(member.id)}>
                      Aceptar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Turn Highlight */}
        {sang.status === 'active' && currentMemberTurn && (
          <div className="gradient-primary rounded-2xl p-5 mb-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-primary-foreground/80 text-sm">Turno Actual</p>
                <div className="flex items-center gap-2">
                  <p className="text-primary-foreground text-2xl font-bold">
                    #{sang.currentTurn} - {currentMemberTurn.name}
                  </p>
                  {/* Status Badge inside Card */}
                  {sang.payoutStatus === 'paid_out' ? (
                    <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full flex items-center">
                      <Check className="h-3 w-3 mr-1" /> Entregado
                    </span>
                  ) : (
                    <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full flex items-center">
                      Recolectando
                    </span>
                  )}
                </div>

                <p className="text-primary-foreground/70 text-sm mt-1">
                  Recibe RD$ {(sang.contributionAmount * sang.numberOfParticipants).toLocaleString()}
                </p>
              </div>

              <div className="h-16 w-16 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <span className="text-primary-foreground text-2xl font-bold">{sang.currentTurn}</span>
              </div>
            </div>

            {/* Organizer Payout Action */}
            {isOrganizer && sang.payoutStatus !== 'paid_out' && (
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-primary-foreground/90 text-xs">
                    <p className="font-semibold mb-0.5">Administrar Turno</p>
                    <p>Confirma cuando hayas entregado el dinero a {currentMemberTurn.name.split(" ")[0]}.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="whitespace-nowrap shadow-sm"
                    onClick={async () => {
                      if (confirm(`¿Confirmas que has entregado el dinero a ${currentMemberTurn.name}?`)) {
                        try {
                          await updateDoc(doc(db, "sangs", sang.id), { payoutStatus: 'paid_out' });
                          toast({ title: "Pago registrado", description: "Se ha marcado el turno como pagado." });
                        } catch (e) { console.error(e); }
                      }
                    }}
                  >
                    Confirmar Entrega
                  </Button>
                </div>
              </div>
            )}
            {/* Legend/Info for Members */}
            {!isOrganizer && (
              <p className="text-primary-foreground/60 text-xs mt-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                El organizador confirmará cuando el dinero sea entregado.
              </p>
            )}
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
          {members.map((member) => {
            const isMe = currentUser && member.userId === currentUser.uid;
            const paymentStatus = member.paymentStatus || 'pending';

            return (
              <div
                key={member.id}
                className={cn(
                  "bg-card rounded-xl p-4 shadow-card flex flex-col gap-3 transition-all",
                  sang.currentTurn === member.turnNumber && sang.status === 'active' && "ring-2 ring-primary"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className={cn("text-sm font-semibold bg-muted")}>
                        {getInitials(member.name || "")}
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
                      <p className="font-medium">{member.name || "Usuario"} {isMe && "(Tú)"}</p>
                      {member.userId === sang.organizerId && (
                        <span className="text-2xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          Admin
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full capitalize",
                        paymentStatus === 'paid' ? "bg-success/10 text-success" :
                          paymentStatus === 'reviewing' ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                      )}>
                        {paymentStatus === 'paid' ? "Pagado" :
                          paymentStatus === 'reviewing' ? "Revisando" : "Pendiente de Pago"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-border/50 gap-2">

                  {/* Organizer: View Bank Details */}
                  {isOrganizer && (
                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handleViewDetails(member.userId)}>
                      <DollarSign className="h-3 w-3 mr-1" /> Ver Cuenta
                    </Button>
                  )}

                  {/* Member Action: Upload Proof */}
                  {isMe && paymentStatus !== 'paid' && paymentStatus !== 'reviewing' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => triggerUpload(member.id)}
                      disabled={uploading}
                    >
                      {uploading && targetMemberId === member.id ? (
                        <>Subiendo...</>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Subir Comprobante
                        </>
                      )}
                    </Button>
                  )}

                  {/* Organizer Action: View Proof */}
                  {isOrganizer && member.paymentProofUrl && (
                    <a href={member.paymentProofUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Ver Comprobante
                      </Button>
                    </a>
                  )}

                  {/* Organizer Action: Approve */}
                  {isOrganizer && paymentStatus === 'reviewing' && (
                    <Button size="sm" className="bg-success text-white hover:bg-success/90" onClick={() => handleApprovePayment(member.id)}>
                      <Check className="h-4 w-4 mr-1" />
                      Aprobar Pago
                    </Button>
                  )}

                  {/* Paid Indicator */}
                  {paymentStatus === 'paid' && (
                    <div className="flex items-center text-success text-sm font-medium">
                      <Check className="h-4 w-4 mr-1" /> Pago Confirmado
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {members.length === 0 && <p className="text-center text-muted-foreground">Esperando miembros...</p>}
        </div>

        {/* Member Details Modal */}
        <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Información del Miembro</DialogTitle>
              <DialogDescription>Detalles de cuenta bancaria y contacto</DialogDescription>
            </DialogHeader>
            {selectedMember && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{getInitials(selectedMember.fullName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-lg leading-none">{selectedMember.fullName}</p>
                    <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Cédula</p>
                    <p className="font-mono font-medium">{selectedMember.cedula || "No registrada"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{selectedMember.phoneNumber || "No registrado"}</p>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-3">
                  <p className="font-semibold text-sm text-primary flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Datos Bancarios
                  </p>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground text-xs">Banco</p>
                      <p className="font-medium">{selectedMember.bankName || "No registrado"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground text-xs">Tipo de Cuenta</p>
                      <p className="font-medium">{selectedMember.accountType || "-"}</p>
                    </div>
                    <div className="col-span-2 space-y-0.5 pt-1">
                      <p className="text-muted-foreground text-xs">Número de Cuenta</p>
                      <div className="flex items-center justify-between bg-background p-2 rounded border border-input">
                        <p className="font-mono font-bold tracking-wider">{selectedMember.accountNumber || "No registrado"}</p>
                        {selectedMember.accountNumber && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedMember.accountNumber);
                              toast({ title: "Copiado" });
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>

      <BottomNav />
    </div>
  );
}
