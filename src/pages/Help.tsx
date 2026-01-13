import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, MessageCircle, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function Help() {
    const navigate = useNavigate();

    const handleWhatsApp = () => {
        // Replace with real support number
        window.open("https://wa.me/18092223333", "_blank");
    };

    const handleEmail = () => {
        window.location.href = "mailto:soporte@todosponen.com";
    };

    return (
        <div className="min-h-screen bg-muted/30 pb-20 md:pb-8">
            <div className="container py-6 max-w-lg mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold">Ayuda y Soporte</h1>
                </div>

                {/* Contact Actions */}
                <div className="grid grid-cols-2 gap-4 mb-8 animate-fade-in">
                    <button
                        onClick={handleWhatsApp}
                        className="bg-[#25D366] text-white p-4 rounded-2xl shadow-sm hover:opacity-90 transition-opacity flex flex-col items-center gap-2"
                    >
                        <MessageCircle className="h-8 w-8" />
                        <span className="font-semibold">WhatsApp</span>
                    </button>

                    <button
                        onClick={handleEmail}
                        className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-sm hover:opacity-90 transition-opacity flex flex-col items-center gap-2"
                    >
                        <Mail className="h-8 w-8" />
                        <span className="font-semibold">Email</span>
                    </button>
                </div>

                {/* FAQ */}
                <div className="bg-card rounded-2xl p-6 shadow-card animate-slide-up">
                    <div className="flex items-center gap-2 mb-4">
                        <HelpCircle className="h-5 w-5 text-primary" />
                        <h2 className="font-semibold">Preguntas Frecuentes</h2>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>¿Cómo funciona un SANG?</AccordionTrigger>
                            <AccordionContent>
                                Un SANG es un grupo de ahorro colaborativo. Todos aportan una cantidad fija periódicamente y en cada turno un miembro recibe el total recolectado.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>¿Es seguro mi dinero?</AccordionTrigger>
                            <AccordionContent>
                                TodosPonen facilita la gestión del compromiso, pero el dinero se transfiere directamente entre usuarios. Recomendamos unirte solo a SANGs con personas de confianza o con alta reputación.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>¿Qué pasa si alguien no paga?</AccordionTrigger>
                            <AccordionContent>
                                Si un usuario no paga, su reputación decae drásticamente y será suspendido de la plataforma. La comunidad depende de la confianza mutua.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4">
                            <AccordionTrigger>¿Puedo salirme de un SANG?</AccordionTrigger>
                            <AccordionContent>
                                Una vez iniciado el SANG, no puedes salirte hasta que finalice la ronda completa, ya que tienes un compromiso con los demás miembros.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </div>
        </div>
    );
}
