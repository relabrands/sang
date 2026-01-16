import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Link2, Users, DollarSign, Calendar, CheckCircle, Divide } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, setDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import type { SANG } from "@/types";
import { cn } from "@/lib/utils";

export default function JoinSANG() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { currentUser, userProfile } = useAuth();

  const [inviteCode, setInviteCode] = useState(searchParams.get("code") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"enter" | "preview" | "success">("enter");
  const [sangPreview, setSangPreview] = useState<SANG & { organizerName: string } | null>(null);
  const [currentMembers, setCurrentMembers] = useState<any[]>([]); // To check limits
  const [selectedShare, setSelectedShare] = useState(1.0);

  const [form, setForm] = useState({ turnNumber: 0 }); // NEW State

  // Auto-trigger search if code came from URL
  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode && urlCode.length >= 6 && step === "enter") {
      handleSearch(urlCode);
    }
  }, []);

  // ... (Bank Check remains same)

  // ... (handleSearch remains same)

  const handleJoin = async () => {
    if (!currentUser || !sangPreview) return;

    // Validation
    if (!form.turnNumber) {
      toast({ variant: "destructive", title: "Turno Requerido", description: "Por favor selecciona un turno." });
      return;
    }

    // Check for Bank Info
    if (!userProfile?.bankName || !userProfile?.accountNumber || !userProfile?.cedula) {
      toast({
        title: "Información Bancaria Requerida",
        description: "Debes completar tu perfil con tu cuenta bancaria y cédula para unirte.",
        variant: "destructive"
      });
      setTimeout(() => navigate("/profile"), 2000);
      return;
    }

    setIsLoading(true);

    try {
      const memberName = userProfile?.fullName || currentUser.displayName || "Usuario";

      // Create request in members subcollection with name!
      await setDoc(doc(db, `sangs/${sangPreview.id}/members`, currentUser.uid), {
        userId: currentUser.uid,
        sangId: sangPreview.id,
        turnNumber: form.turnNumber, // SAVE SELECTED TURN
        status: "pending",
        joinedAt: serverTimestamp(),
        name: memberName,
        sharePercentage: selectedShare, // Save 0.5 or 1.0
      });

      setStep("success");
      toast({
        title: "Solicitud enviada",
        description: "El organizador revisará tu solicitud pronto.",
      });
    } catch (error) {
      console.error("Error joining SANG:", error);
      toast({
        title: "Error",
        description: "No pudimos enviar tu solicitud. Inténtalo más tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-8">
      <Header />

      <main className="container py-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (step === "preview") {
                setStep("enter");
                setSangPreview(null);
              } else {
                navigate(-1);
              }
            }}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">Unirme a un SANG</h1>
          <p className="text-muted-foreground">
            {step === "enter" && "Ingresa el código de invitación"}
            {step === "preview" && "Revisa los detalles del SANG"}
            {step === "success" && "¡Solicitud enviada!"}
          </p>
        </div>

        {/* Step: Enter Code */}
        {step === "enter" && (
          <div className="space-y-6 animate-slide-up">
            <div className="h-20 w-20 rounded-2xl bg-accent flex items-center justify-center mx-auto">
              <Link2 className="h-10 w-10 text-primary" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Código de invitación</Label>
              <Input
                id="code"
                placeholder="Ej: ABC123"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="text-center text-2xl font-mono tracking-widest h-14"
                maxLength={8}
                autoFocus
              />
              <p className="text-sm text-muted-foreground text-center">
                Pide el código al organizador del SANG
              </p>
            </div>

            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={() => handleSearch()}
              disabled={inviteCode.length < 6 || isLoading}
            >
              {isLoading ? "Buscando..." : "Buscar SANG"}
            </Button>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && sangPreview && (
          <div className="space-y-6 animate-slide-up">
            <div className="bg-card rounded-2xl p-6 shadow-card">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-xl gradient-primary flex items-center justify-center">
                  <Users className="h-7 w-7 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">{sangPreview.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Organizado por {sangPreview.organizerName}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <DollarSign className="h-5 w-5" />
                    <span>Contribución</span>
                  </div>
                  <span className="font-semibold">
                    RD$ {sangPreview.contributionAmount.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="h-5 w-5" />
                    <span>Frecuencia</span>
                  </div>
                  <span className="font-semibold capitalize">{sangPreview.frequency}</span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Users className="h-5 w-5" />
                    <span>Miembros</span>
                  </div>
                  <span className="font-semibold">
                    {sangPreview.numberOfParticipants} Participantes
                  </span>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="h-5 w-5" />
                    <span>Inicio</span>
                  </div>
                  <span className="font-semibold">
                    {sangPreview.startDate instanceof Object && 'seconds' in sangPreview.startDate
                      ? new Date((sangPreview.startDate as any).seconds * 1000).toLocaleDateString("es-DO")
                      : new Date(sangPreview.startDate).toLocaleDateString("es-DO")}
                  </span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-accent rounded-xl">
                <p className="text-sm text-center text-muted-foreground">
                  Pago por turno:{" "}
                  <span className="text-lg font-bold text-primary block mt-1">
                    RD$ {(sangPreview.contributionAmount * sangPreview.numberOfParticipants).toLocaleString()}
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Share Selection if Allowed */}
              {sangPreview.allowHalfShares && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-xl border border-border">
                  <Label className="text-base font-semibold">Tipo de Participación</Label>
                  {(() => {
                    // Logic to check limits
                    // 1. Open Half Slots: Turns with exactly ONE 0.5 member
                    // 2. New Half Slots: Turns with ZERO members, if we haven't reached maxHalfShares

                    const halfMembers = currentMembers.filter(m => m.sharePercentage === 0.5);

                    // Count unique turns already using 'Half'
                    // Note: If data model doesn't strictly enforce turnNumber on creation (0 means unassigned), 
                    // we might need to rely on just count.
                    // But usually, limits are about "how many splits allowed".

                    // Simple logic:
                    // Max Halves setting = "Number of Split Turns".
                    // Current Split Turns = count(turns where exists a 0.5 member)

                    // BUT for joining, users often have turnNumber = 0 (unassigned).
                    // So we must count how many 0.5 users exist globally.
                    // Each split turn holds 2 users. So Max Users = maxHalfShares * 2.
                    const halfUserCount = halfMembers.length;
                    const maxHalfUsers = (sangPreview.maxHalfShares || 0) * 2;

                    const canJoinHalf = halfUserCount < maxHalfUsers;

                    return (
                      <RadioGroup
                        value={selectedShare.toString()}
                        onValueChange={(v) => setSelectedShare(parseFloat(v))}
                        className="grid grid-cols-2 gap-3"
                      >
                        <label className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedShare === 1 ? 'border-primary bg-primary/5' : 'border-border'}`}>
                          <RadioGroupItem value="1" className="sr-only" />
                          <Users className="h-5 w-5 text-primary" />
                          <div className="text-center">
                            <span className="block font-bold">Completo</span>
                            <span className="text-xs text-muted-foreground">100% Cuota</span>
                          </div>
                        </label>

                        <label className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${!canJoinHalf ? 'opacity-50 cursor-not-allowed border-dashed' : 'cursor-pointer'} ${selectedShare === 0.5 ? 'border-primary bg-primary/5' : 'border-border'}`}>
                          <RadioGroupItem value="0.5" className="sr-only" disabled={!canJoinHalf} />
                          <Divide className="h-5 w-5 text-primary" />
                          <div className="text-center">
                            <span className="block font-bold">Medio</span>
                            <span className="text-xs text-muted-foreground">{canJoinHalf ? "50% Cuota" : "Cupos Llenos"}</span>
                          </div>
                        </label>
                      </RadioGroup>
                    );
                  })()}
                  <div className="text-center text-sm">
                    Pagarás: <span className="font-bold text-primary">RD$ {(sangPreview.contributionAmount * selectedShare).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* TURN SELECTION GRID */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Selecciona tu Turno</Label>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: sangPreview.numberOfParticipants }, (_, i) => i + 1).map((turn) => {
                    const turnMembers = currentMembers.filter(m => m.turnNumber === turn);
                    const occupiedShares = turnMembers.reduce((acc, m) => acc + (m.sharePercentage || 1), 0);

                    // Status Calculation
                    let status: 'empty' | 'half' | 'full' = 'empty';
                    if (occupiedShares >= 1) status = 'full';
                    else if (occupiedShares > 0) status = 'half';

                    // Availability Logic
                    let isAvailable = false;
                    let label = `${turn}`;

                    if (selectedShare === 1.0) {
                      // Full Share: Needs completely empty turn
                      if (status === 'empty') isAvailable = true;
                    } else {
                      // Half Share: Needs empty or half-full
                      if (status === 'empty') isAvailable = true;
                      if (status === 'half') {
                        isAvailable = true;
                        label += " ½"; // Visual cue
                      }
                    }

                    return (
                      <button
                        key={turn}
                        type="button"
                        onClick={() => isAvailable && setForm({ ...form, turnNumber: turn })}
                        disabled={!isAvailable}
                        className={cn(
                          "h-12 rounded-lg font-bold border-2 transition-all flex items-center justify-center relative",
                          form.turnNumber === turn
                            ? "border-primary bg-primary text-primary-foreground scale-105 shadow-md"
                            : isAvailable
                              ? status === 'half'
                                ? "border-warning/50 bg-warning/10 text-warning hover:border-warning hover:bg-warning/20"
                                : "border-border bg-card hover:border-primary/50"
                              : "border-border/50 bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
                        )}
                      >
                        {label}
                        {status === 'half' && isAvailable && (
                          <span className="absolute -top-2 -right-2 h-4 w-4 bg-warning text-[10px] text-warning-foreground rounded-full flex items-center justify-center">
                            1
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {selectedShare === 0.5 ? "🟡 Turnos con 1/2 disponible" : "Solo turnos vacíos"}
                </p>
              </div>

              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={handleJoin}
                disabled={isLoading || !form.turnNumber}
              >
                {isLoading ? "Enviando solicitud..." : `Solicitar Unirme (Turno ${form.turnNumber || '?'})`}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                El organizador debe aprobar tu solicitud para que puedas participar
              </p>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="text-center space-y-6 animate-scale-in">
            <div className="h-24 w-24 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-12 w-12 text-success" />
            </div>

            <div>
              <h2 className="text-xl font-bold mb-2">¡Solicitud Enviada!</h2>
              <p className="text-muted-foreground">
                El organizador de <strong>{sangPreview?.name}</strong> revisará tu solicitud.
                Te notificaremos cuando sea aprobada.
              </p>
            </div>

            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => navigate("/dashboard")}
            >
              Volver al Inicio
            </Button>
          </div>
        )
        }
      </main >

      <BottomNav />
    </div >
  );
}
