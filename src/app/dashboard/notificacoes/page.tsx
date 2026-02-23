import { Metadata } from "next"
import { getNotifications, getDailySummary } from "@/app/actions/notifications"
import NotificationsClient from "./notifications-client"

export const metadata: Metadata = {
    title: "Central de Notificações | Orbital Hub",
    description: "Histórico e resumo inteligente de todas as notificações do sistema",
}

export default async function NotificacoesPage() {
    const [notifications, summary] = await Promise.all([
        getNotifications({ status: "ALL" }),
        getDailySummary(),
    ])

    return <NotificationsClient notifications={notifications} todaySummary={summary} />
}
