import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
ArrowLeft,
  Users,
  AlertTriangle,
  DollarSign,
  Activity,
  BarChart3,
  UserCheck,
  Shield,
  ChevronRight,
  Bell,
  Send,
  FileText,
  Eye,
  Plus,
  Edit,
  Save,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { DashboardCard } from "@/components/DashboardCard";
import { ReputationBadge } from "@/components/ReputationBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db, functions } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { collection, query, orderBy, getDocs, where, getCountFromServer, collectionGroup, onSnapshot, setDoc, doc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userProfile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "sangs" | "payments" | "notifications" | "templates">("overview");

  // Notification State
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);

  // Template State
  const [templates, setTemplates] = useState<any[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<any>(null); // null = list mode, object = edit mode
  const [previewTemplate, setPreviewTemplate] = useState<any>(null); // for modal

  // Real Data State
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSangs: 0,
    completedSangs: 0,
    monthlyVolume: 0,
    latePaymentRatio: 0,
    averageReputation: 100,
  });

  // Lists
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentSangs, setRecentSangs] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allSangs, setAllSangs] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [rawPayments, setRawPayments] = useState<any[]>([]); // To store raw firestore data

  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    // 1. Users Subscription
    const qUsers = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(users);
      setRecentUsers(users.slice(0, 5));
      setStats(prev => ({ ...prev, totalUsers: users.length }));
    });

    // 2. SANGs Subscription
    const qSangs = query(collection(db, "sangs"), orderBy("createdAt", "desc"));
    const unsubSangs = onSnapshot(qSangs, (snapshot) => {
      const sangs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllSangs(sangs);
      setRecentSangs(sangs.slice(0, 5));
      setStats(prev => ({
        ...prev,
        activeSangs: sangs.filter(s => s.status === "active").length,
        completedSangs: sangs.filter(s => s.status === "completed").length,
      }));
    });

    // 3. Payments (Members) Subscription
    // Note: Requires COLLECTION_GROUP_ASC index on 'members' for 'paymentStatus'
    const qPayments = query(
      collectionGroup(db, 'members'),
      where('paymentStatus', 'in', ['paid', 'reviewing'])
    );
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawPayments(members);
      setLoadingConfig(false);
    }, (error) => {
      console.error("Error/Index missing for payments listener:", error);
      setLoadingConfig(false);
    });


    // 4. Templates Subscription
    const qTemplates = collection(db, "email_templates");
    const unsubTemplates = onSnapshot(qTemplates, (snapshot) => {
      const tpls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTemplates(tpls);
    });

    return () => {
      unsubUsers();
      unsubSangs();
      unsubPayments();
      unsubTemplates();
    };
  }, []);

  // Derived Data Effect: Calculate Payments Details & Volume
  useEffect(() => {
    if (allSangs.length > 0) {
      const sangsMap = new Map(allSangs.map(s => [s.id, s]));
      const usersMap = new Map(allUsers.map(u => [u.id, u]));

      const enrichedPayments = rawPayments.map(p => {
        const sang = sangsMap.get(p.sangId);
        const user = usersMap.get(p.userId);
        return {
          ...p,
          sangName: sang?.name || "Desconocido",
          amount: sang?.contributionAmount || 0,
          userName: user?.fullName || p.name || "Usuario",
          date: p.lastPaymentDate?.toDate ? p.lastPaymentDate.toDate() : new Date()
        };
      });

      // Sort by date desc
      enrichedPayments.sort((a: any, b: any) => b.date - a.date);
      setAllPayments(enrichedPayments);

      // Recalculate Monthly Volume
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const currentMonthPayments = enrichedPayments.filter(p =>
        p.paymentStatus === 'paid' && p.date >= startOfMonth
      );

      const totalVolume = currentMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      setStats(prev => ({ ...prev, monthlyVolume: totalVolume }));
    }
  }, [allSangs, rawPayments, allUsers]);

  const getInitials = (name: string) => {
    return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase() : "U";
  };

  const handleSendBroadcast = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      toast({ variant: "destructive", title: "Campos requeridos", description: "Completa título y mensaje." });
      return;
    }

    setSendingNotif(true);
    try {
      // Use httpsCallable directly or from functions instance
      const sendBroadcast = httpsCallable(functions, 'sendBroadcast');
      const result = await sendBroadcast({ title: notifTitle, body: notifBody }) as any;

      if (result.data.success) {
        toast({
          title: "Notificación enviada",
          description: `Enviada a ${result.data.count} dispositivos.`,
        });
        setNotifTitle("");
        setNotifBody("");
      } else {
        toast({ variant: "destructive", title: "Error", description: result.data.message || "Error desconocido." });
      }
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Error de envío", description: error.message });
    } finally {
      setSendingNotif(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  if (authLoading || loadingConfig) {
    return <div className="min-h-screen flex items-center justify-center">Cargando panel de administración...</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-8">
      <Header user={userProfile as any} onLogout={handleLogout} />

      <main className="container py-6">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Panel de Administración</span>
          </div>
          <h1 className="text-2xl font-bold">Dashboard Admin</h1>
          <p className="text-muted-foreground">Vista general de la plataforma TodosPonen</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {[
            { value: "overview", label: "Resumen" },
            { value: "users", label: "Usuarios" },
            { value: "sangs", label: "SANGs" },
            { value: "payments", label: "Pagos" },
            { value: "notifications", label: "Notificaciones" },
            { value: "templates", label: "Plantillas" },
          ].map((tab) => (
            <Button
              key={tab.value}
              variant={activeTab === tab.value ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.value as typeof activeTab)}
              className="shrink-0"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-slide-up">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <DashboardCard
                title="Usuarios Totales"
                value={stats.totalUsers.toLocaleString()}
                icon={Users}
              />
              <DashboardCard
                title="SANGs Activos"
                value={stats.activeSangs.toString()}
                icon={Activity}
              />
              <DashboardCard
                title="SANGs Completados"
                value={stats.completedSangs.toString()}
                icon={UserCheck}
              />
              <DashboardCard
                title="Volumen Mensual"
                value={`RD$ ${(stats.monthlyVolume / 1000000).toFixed(1)}M`}
                icon={DollarSign}
                variant="primary"
              />
              <DashboardCard
                title="Pagos Tardíos"
                value={`${stats.latePaymentRatio}%`}
                icon={AlertTriangle}
                variant="warning"
              />
              <DashboardCard
                title="Reputación Promedio"
                value={stats.averageReputation}
                icon={BarChart3}
              />
            </div>

            {/* Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Users */}
              <div className="bg-card rounded-2xl p-5 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Usuarios Recientes</h2>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("users")}>
                    Ver todos
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="space-y-3">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 py-2">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-accent text-accent-foreground text-sm">
                          {getInitials(user.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <ReputationBadge score={user.reputationScore || 100} size="sm" showTooltip={false} />
                    </div>
                  ))}
                  {recentUsers.length === 0 && <p className="text-sm text-muted-foreground">No hay usuarios recientes.</p>}
                </div>
              </div>

              {/* SANGs List */}
              <div className="bg-card rounded-2xl p-5 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">SANGs Recientes</h2>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("sangs")}>
                    Ver todos
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="space-y-3">
                  {recentSangs.map((sang) => (
                    <div key={sang.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{sang.name}</p>
                        <div className="flex gap-2">
                          <StatusBadge status={sang.status} />
                          <span className="text-xs text-muted-foreground mt-1">
                            {sang.numberOfParticipants} miembros
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">RD$ {sang.contributionAmount}</p>
                        <p className="text-xs text-muted-foreground">{sang.frequency}</p>
                      </div>
                    </div>
                  ))}
                  {recentSangs.length === 0 && <p className="text-sm text-muted-foreground">No hay SANGs recientes.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab - Full List */}
        {activeTab === "users" && (
          <div className="bg-card rounded-2xl p-5 shadow-card animate-slide-up">
            <h2 className="font-semibold mb-4">Todos los Usuarios ({stats.totalUsers})</h2>
            <div className="space-y-3">
              {allUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {getInitials(user.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.fullName}</p>
                      {user.role === 'admin' && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">ADMIN</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unido el {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <ReputationBadge score={user.reputationScore || 100} showTooltip={false} />
                  <Button variant="outline" size="sm">
                    Ver perfil
                  </Button>
                </div>
              ))}
              {allUsers.length === 0 && <p className="text-center text-muted-foreground py-8">No se encontraron usuarios.</p>}
            </div>
          </div>
        )}

        {/* SANGs Tab - Full List */}
        {activeTab === "sangs" && (
          <div className="bg-card rounded-2xl p-5 shadow-card animate-slide-up">
            <h2 className="font-semibold mb-4">Todos los SANGs ({stats.activeSangs})</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-muted-foreground border-b border-border">
                    <th className="pb-3 font-medium">Nombre</th>
                    <th className="pb-3 font-medium">Miembros</th>
                    <th className="pb-3 font-medium">Estado</th>
                    <th className="pb-3 font-medium text-right">Monto</th>
                    <th className="pb-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {allSangs.map((sang) => (
                    <tr key={sang.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-4 font-medium max-w-[200px] truncate">
                        {sang.name}
                        <br />
                        <span className="text-xs text-muted-foreground font-normal">Code: {sang.inviteCode}</span>
                      </td>
                      <td className="py-4 text-muted-foreground">{sang.numberOfParticipants}</td>
                      <td className="py-4">
                        <StatusBadge status={sang.status} />
                      </td>
                      <td className="py-4 text-right font-medium">
                        RD$ {sang.contributionAmount?.toLocaleString()}
                        <span className="text-xs text-muted-foreground block">{sang.frequency}</span>
                      </td>
                      <td className="py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/sang/${sang.id}`)}
                        >
                          Ver detalles
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {allSangs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted-foreground py-8">No se encontraron SANGs.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments Tab Placeholder */}
        {activeTab === "payments" && (
          <div className="bg-card rounded-2xl p-5 shadow-card animate-slide-up">
            <h2 className="font-semibold mb-4">Historial de Pagos Global</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-muted-foreground border-b border-border">
                    <th className="pb-3 font-medium">Usuario</th>
                    <th className="pb-3 font-medium">SANG</th>
                    <th className="pb-3 font-medium">Estado</th>
                    <th className="pb-3 font-medium text-right">Monto</th>
                    <th className="pb-3 font-medium text-right">Fecha</th>
                    <th className="pb-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {allPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-4 font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{getInitials(payment.userName)}</AvatarFallback>
                          </Avatar>
                          <span>{payment.userName}</span>
                        </div>
                      </td>
                      <td className="py-4 text-sm">{payment.sangName}</td>
                      <td className="py-4">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full capitalize",
                          payment.paymentStatus === 'paid' ? "bg-success/10 text-success" :
                            payment.paymentStatus === 'reviewing' ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                        )}>
                          {payment.paymentStatus === 'paid' ? "Pagado" : "Revisando"}
                        </span>
                      </td>
                      <td className="py-4 text-right font-medium">
                        RD$ {payment.amount?.toLocaleString()}
                      </td>
                      <td className="py-4 text-right text-sm text-muted-foreground">
                        {payment.date?.toLocaleDateString()}
                      </td>
                      <td className="py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/sang/${payment.sangId}`)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {allPayments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted-foreground py-8">No hay pagos registrados aún.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="max-w-xl mx-auto animate-slide-up">
            <div className="bg-card rounded-2xl p-6 shadow-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Enviar Notificación Push</h2>
                  <p className="text-sm text-muted-foreground">Mensaje a todos los usuarios de la app</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Ej: Nuevo SANG disponible"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Mensaje</label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Escribe el contenido de la notificación..."
                    value={notifBody}
                    onChange={(e) => setNotifBody(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <Button
                    className="w-full gap-2"
                    onClick={handleSendBroadcast}
                    disabled={sendingNotif || !notifTitle || !notifBody}
                  >
                    {sendingNotif ? (
                      "Enviando..."
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Enviar Broadcast
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Se enviará a todos los dispositivos registrados con permisos de notificación.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Templates Tab */}
        {activeTab === "templates" && (
          <div className="animate-slide-up">
            {!editingTemplate ? (
              // List View
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Plantillas de Correo</h2>
                  <Button onClick={() => setEditingTemplate({ id: "", subject: "", bodyHtml: "" })}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Plantilla
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {templates.map((tpl) => (
                    <div key={tpl.id} className="bg-card p-4 rounded-xl shadow-sm border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setEditingTemplate(tpl)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      <h3 className="font-semibold">{tpl.subject || "Sin Asunto"}</h3>
                      <p className="text-xs text-muted-foreground font-mono mt-1">{tpl.id}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Edit View
              <div className="bg-card rounded-2xl p-6 shadow-card max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditingTemplate(null)}>
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="text-xl font-bold">
                      {editingTemplate.id && templates.find(t => t.id === editingTemplate.id) ? "Editar Plantilla" : "Nueva Plantilla"}
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setPreviewTemplate(editingTemplate)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Previsualizar
                    </Button>
                    <Button onClick={async () => {
                      if (!editingTemplate.id) {
                        toast({ variant: "destructive", title: "Error", description: "El ID es requerido" });
                        return;
                      }
                      try {
                        await setDoc(doc(db, "email_templates", editingTemplate.id), {
                          subject: editingTemplate.subject,
                          bodyHtml: editingTemplate.bodyHtml
                        });
                        toast({ title: "Guardado", description: "Plantilla actualizada correctamente." });
                        setEditingTemplate(null);
                      } catch (e) {
                        console.error(e);
                        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar." });
                      }
                    }}>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">ID de Plantilla (ej: request_accepted)</label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={editingTemplate.id}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, id: e.target.value })}
                        disabled={!!templates.find(t => t.id === editingTemplate.id && editingTemplate.id !== "")} // Disable ID edit if existing
                        placeholder="unique_id"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Asunto del Correo</label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={editingTemplate.subject}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                        placeholder="Bienvenido a {{sangName}}"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cuerpo HTML</label>
                    <textarea
                      className="flex min-h-[400px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                      value={editingTemplate.bodyHtml}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, bodyHtml: e.target.value })}
                      placeholder="<html>...</html>"
                    />
                    <p className="text-xs text-muted-foreground">Variables disponibles: {`{{memberName}}, {{sangName}}, {{turnNumber}}, {{role}}`}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-background w-full max-w-3xl rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">Previsualización: {previewTemplate.subject}</h3>
              <Button variant="ghost" size="icon" onClick={() => setPreviewTemplate(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-0 bg-white">
              <iframe
                className="w-full h-full min-h-[500px]"
                srcDoc={previewTemplate.bodyHtml}
                title="Preview"
              />
            </div>
          </div>
        </div>
      )}
