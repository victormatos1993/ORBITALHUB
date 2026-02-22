"use client"

import { Construction, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface MaintenanceOverlayProps {
    title?: string
    description?: string
    className?: string
}

export function MaintenanceOverlay({
    title = "Em Manutenção",
    description = "Esta funcionalidade está em desenvolvimento e estará disponível em breve com recursos incríveis.",
    className
}: MaintenanceOverlayProps) {
    return (
        <div className={cn(
            "relative w-full h-full min-h-[400px] flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-8 overflow-hidden",
            className
        )}>
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

            <div className="relative flex flex-col items-center text-center max-w-md gap-6 animate-in fade-in zoom-in duration-500">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-xl shadow-primary/10 animate-pulse">
                    <Construction className="h-10 w-10" />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                        <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                        {description}
                    </p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                    <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">Lançamento em Breve</span>
                </div>
            </div>
        </div>
    )
}
