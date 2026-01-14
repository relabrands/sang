import React from 'react';
import { Button } from "@/components/ui/button";
import { HelpCircle, Play, FileText, Upload, Mail } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TourButtonProps {
    onStartTutorial: () => void;
}

export function TourButton({ onStartTutorial }: TourButtonProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    className="fixed bottom-24 right-4 z-50 rounded-full w-14 h-14 bg-[#6D2AE1] hover:bg-[#5b23b8] shadow-xl border-4 border-white/20 transition-transform active:scale-95 animate-in fade-in zoom-in duration-300"
                    size="icon"
                    aria-label="Abrir ayuda"
                >
                    <HelpCircle className="w-8 h-8 text-white" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mb-2 mr-4 bg-white/95 backdrop-blur-sm shadow-2xl border-white/20">
                <DropdownMenuLabel>Ayuda y Tutoriales</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onStartTutorial} className="cursor-pointer gap-2 py-3">
                    <Play className="h-4 w-4 text-[#6D2AE1]" />
                    <span>Ver tutorial completo</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="cursor-not-allowed gap-2 opacity-50">
                    <FileText className="h-4 w-4" />
                    <span>Cómo crear un SANG</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="cursor-not-allowed gap-2 opacity-50">
                    <Upload className="h-4 w-4" />
                    <span>Cómo subir comprobante</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="cursor-not-allowed gap-2 opacity-50">
                    <Mail className="h-4 w-4" />
                    <span>Soporte Técnico</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
