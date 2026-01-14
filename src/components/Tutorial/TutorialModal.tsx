
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TutorialModalProps {
    open: boolean;
    onStart: () => void;
    onSkip: () => void;
}

export function TutorialModal({ open, onStart, onSkip }: TutorialModalProps) {
    return (
        <Dialog open={open} onOpenChange={(val) => !val && onSkip()}>
            <DialogContent className="sm:max-w-md bg-white border-0 shadow-xl rounded-2xl">
                <DialogHeader className="text-center pt-6">
                    <div className="mx-auto bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-3xl">
                        👋
                    </div>
                    <DialogTitle className="text-2xl font-bold text-gray-900">
                        Bienvenido a TodosPonen
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 text-lg mt-2">
                        En 60 segundos te enseñamos lo básico para usar tus SANGs.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col gap-2 sm:justify-center mt-4 pb-6">
                    <Button
                        onClick={onStart}
                        className="w-full bg-[#6D2AE1] hover:bg-[#5b23b8] text-white font-semibold rounded-xl h-12 text-md transition-all shadow-lg shadow-purple-200"
                    >
                        Continuar
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onSkip}
                        className="w-full text-gray-500 hover:text-gray-700 hover:bg-transparent font-normal"
                    >
                        Omitir
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
