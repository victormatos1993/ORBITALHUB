import { Metadata } from "next"
import { ConnectionsContent } from "@/components/conexoes/connections-content"
import { MaintenanceOverlay } from "@/components/ui/maintenance-overlay"

export const metadata: Metadata = {
    title: "Conexões | Orbital Hub",
    description: "Gerencie as integrações com marketplaces e lojas virtuais",
}

export default function ConexoesPage() {
    return (
        <div className="relative">
            <div className="absolute inset-0 z-10">
                <MaintenanceOverlay
                    title="Conexões em Manutenção"
                    description="Estamos expandindo nossas integrações com novos marketplaces e transportadoras. Em breve você terá um ecossistema completo aqui."
                />
            </div>
            <div className="opacity-20 pointer-events-none select-none filter blur-[2px]">
                <ConnectionsContent />
            </div>
        </div>
    )
}
