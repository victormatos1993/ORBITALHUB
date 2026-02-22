import { Metadata } from "next"
import { SettingsContent } from "@/components/settings/settings-content"

export const metadata: Metadata = {
    title: "Configurações | Orbital Hub",
    description: "Gerencie as configurações do sistema",
}

export default function SettingsPage() {
    return <SettingsContent />
}
