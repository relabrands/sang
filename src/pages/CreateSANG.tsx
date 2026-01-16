import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Users, Calendar, Shuffle, ListOrdered, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import type { Frequency, TurnAssignment } from "@/types";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, setDoc, doc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

const frequencyOptions = [
  { value: "weekly", label: "Semanal", description: "Pagos cada 7 días" },
  { value: "biweekly", label: "Quincenal", description: "Pagos cada 15 días" },
  { value: "monthly", label: "Mensual", description: "Pagos cada 30 días" },
];

const turnOptions = [
  { value: "random", label: "Aleatorio", icon: Shuffle, description: "Asignación al azar" },
  { value: "manual", label: "Manual", icon: ListOrdered, description: "Tú decides el orden" },
];

// Helper to generate a random 6-character alphanumeric code
const generateInviteCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function CreateSANG() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    contributionAmount: "",
    frequency: "monthly" as Frequency,
    numberOfParticipants: "",
    startDate: "",
    turnAssignment: "random" as TurnAssignment,
  });

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  // PROACTIVE CHECK: Enforce Bank Info
  useEffect(() => {
    // Wait for profile to load
    if (userProfile && (!userProfile.bankName || !userProfile.accountNumber || !userProfile.cedula)) {
      toast({
        title: "Perfil Incompleto",
        description: "Para crear un SANG, primero debes configurar tu información bancaria.",
        variant: "destructive",
        duration: 5000
      });
      navigate("/profile");
    }
  }, [userProfile, navigate, toast]);

  const isStepValid = () => {
    switch (step) {
      case 1:
        return form.name.length >= 3;
      case 2:
        return form.contributionAmount && parseInt(form.contributionAmount) >= 100;
      case 3:
        return form.numberOfParticipants && parseInt(form.numberOfParticipants) >= 2;
      case 4:
        return form.startDate;
      default:
        return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Protection: If not on step 5, just go to next step
    if (step !== 5) {
      if (isStepValid()) nextStep();
      return;
    }

    if (!currentUser) return;

    // Check for Bank Info
    if (!userProfile?.bankName || !userProfile?.accountNumber || !userProfile?.cedula) {
      toast({
        title: "Información Bancaria Requerida",
        description: "Debes completar tu perfil con tu cuenta bancaria para ser organizador.",
        variant: "destructive"
      });
      setTimeout(() => navigate("/profile"), 2000);
      return;
    }

    setIsLoading(true);

    try {
      const inviteCode = generateInviteCode();
      const sangData = {
        name: form.name,
        contributionAmount: parseInt(form.contributionAmount),
        frequency: form.frequency,
        numberOfParticipants: parseInt(form.numberOfParticipants),
        startDate: new Date(form.startDate),
        turnAssignment: form.turnAssignment,
        organizerId: currentUser.uid,
        status: "active",
        inviteCode: inviteCode,
        currentTurn: 1,
        createdAt: serverTimestamp(),
      };

      // Create SANG document
      const docRef = await addDoc(collection(db, "sangs"), sangData);

      // Add organizer as a member in 'members' subcollection
      await setDoc(doc(db, `sangs/${docRef.id}/members`, currentUser.uid), {
        userId: currentUser.uid,
        sangId: docRef.id,
        turnNumber: 1,
        status: "approved",
        joinedAt: serverTimestamp(),
        role: "organizer",
        name: userProfile?.fullName || "Organizador",
      });

      toast({
        title: "¡SANG creado!",
        description: `Tu SANG ha sido creado exitosamente. Código: ${inviteCode}`,
      });
      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating SANG:", error);
      toast({
        title: "Error",
        description: "Hubo un error al crear el SANG. Inténtalo de nuevo.",
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
        <div className="mb-6 animate-fade-in">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (step > 1 ? prevStep() : navigate(-1))}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {step > 1 ? "Anterior" : "Volver"}
          </Button>
          <h1 className="text-2xl font-bold">Crear SANG</h1>
          <p className="text-muted-foreground">Paso {step} de 5</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${s <= step ? "bg-primary" : "bg-border"
                }`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 animate-slide-up">
          {/* Step 1: Name */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold">¿Cómo se llamará tu SANG?</h2>
                <p className="text-muted-foreground text-sm">Un nombre que identifique a tu grupo</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del SANG</Label>
                <Input
                  id="name"
                  placeholder="Ej: SANG Familia García"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="text-lg h-12"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 2: Amount */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-6">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold">¿Cuánto contribuirá cada miembro?</h2>
                <p className="text-muted-foreground text-sm">Monto en pesos dominicanos</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Contribución (RD$)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    RD$
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="5,000"
                    value={form.contributionAmount}
                    onChange={(e) => setForm({ ...form, contributionAmount: e.target.value })}
                    className="text-lg h-12 pl-14"
                    min={100}
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Frecuencia de pago</Label>
                <RadioGroup
                  value={form.frequency}
                  onValueChange={(v) => setForm({ ...form, frequency: v as Frequency })}
                  className="space-y-3"
                >
                  {frequencyOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.frequency === option.value
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/50"
                        }`}
                    >
                      <RadioGroupItem value={option.value} />
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 3: Participants */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold">¿Cuántos participantes?</h2>
                <p className="text-muted-foreground text-sm">Incluyéndote a ti</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="participants">Número de participantes</Label>
                <Input
                  id="participants"
                  type="number"
                  placeholder="10"
                  value={form.numberOfParticipants}
                  onChange={(e) => setForm({ ...form, numberOfParticipants: e.target.value })}
                  className="text-lg h-12"
                  min={2}
                  max={50}
                  autoFocus
                />
              </div>
              {form.contributionAmount && form.numberOfParticipants && (
                <div className="bg-accent rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">Pago total por turno</p>
                  <p className="text-2xl font-bold text-primary">
                    RD$ {(parseInt(form.contributionAmount) * parseInt(form.numberOfParticipants)).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Start Date & Turn Assignment */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold">Configuración final</h2>
                <p className="text-muted-foreground text-sm">Fecha de inicio y asignación de turnos</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha de inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="text-lg h-12"
                  min={new Date().toISOString().split("T")[0]}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Asignación de turnos</Label>
                <div className="grid grid-cols-2 gap-3">
                  {turnOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm({ ...form, turnAssignment: option.value as TurnAssignment })}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${form.turnAssignment === option.value
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/50"
                        }`}
                    >
                      <option.icon className="h-6 w-6 text-primary" />
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Summary */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
                <Check className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold">¡Todo listo!</h2>
                <p className="text-muted-foreground text-sm">Revisa los detalles de tu SANG</p>
              </div>
              <div className="bg-card rounded-2xl p-5 shadow-card space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Nombre</span>
                  <span className="font-medium">{form.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Contribución</span>
                  <span className="font-medium">RD$ {parseInt(form.contributionAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Frecuencia</span>
                  <span className="font-medium capitalize">
                    {frequencyOptions.find((f) => f.value === form.frequency)?.label}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Participantes</span>
                  <span className="font-medium">{form.numberOfParticipants}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Inicio</span>
                  <span className="font-medium">
                    {new Date(form.startDate).toLocaleDateString("es-DO")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Turnos</span>
                  <span className="font-medium capitalize">
                    {turnOptions.find((t) => t.value === form.turnAssignment)?.label}
                  </span>
                </div>
                <div className="pt-3 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pago por turno</span>
                    <span className="text-xl font-bold text-primary">
                      RD$ {(parseInt(form.contributionAmount) * parseInt(form.numberOfParticipants)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="pt-4">
            {step < 5 ? (
              <Button
                type="button"
                variant="hero"
                size="lg"
                className="w-full"
                onClick={nextStep}
                disabled={!isStepValid()}
              >
                Continuar
              </Button>
            ) : (
              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Creando SANG..." : "Crear SANG"}
              </Button>
            )}
          </div>
        </form>
      </main>

      {/* BottomNav removed to prevent mobile keyboard glitches */}
    </div>
  );
}
