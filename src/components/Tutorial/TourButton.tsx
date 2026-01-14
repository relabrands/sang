
import React from 'react';
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

interface TourButtonProps {
    onClick: () => void;
}

export function TourButton({ onClick }: TourButtonProps) {
    return (
        <Button
            onClick={onClick}
            className="fixed bottom-24 right-4 z-50 rounded-full w-14 h-14 bg-[#6D2AE1] hover:bg-[#5b23b8] shadow-xl border-4 border-white/20 transition-transform active:scale-95 animate-in fade-in zoom-in duration-300"
            size="icon"
            aria-label="Abrir tutorial"
        >
            <HelpCircle className="w-8 h-8 text-white" />
        </Button>
    );
}
