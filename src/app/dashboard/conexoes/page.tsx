import { Metadata } from "next"
import { ConnectionsContent } from "@/components/conexoes/connections-content"

export const metadata: Metadata = {
    title: "Conexões | Orbital Hub",
    description: "Gerencie as integrações com marketplaces e lojas virtuais",
}

export default function ConexoesPage() {
    return <ConnectionsContent />
}
