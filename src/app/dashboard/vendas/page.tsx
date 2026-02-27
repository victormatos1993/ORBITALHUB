import { Metadata } from "next"
import { getSales } from "@/app/actions/sales"
import { VendasClient } from "./vendas-client"

export const metadata: Metadata = {
    title: "Histórico de Vendas | Orbital Hub",
    description: "Visualize suas vendas",
}

export default async function SalesPage() {
    const { sales } = await getSales()

    const serialized = sales.map(s => ({
        ...s,
        date: typeof s.date === "object" ? (s.date as Date).toISOString().split("T")[0] : String(s.date).split("T")[0],
        totalAmount: Number(s.totalAmount),
    }))

    return <VendasClient sales={serialized} />
}
