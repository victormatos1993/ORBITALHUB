import { Metadata } from "next"
import { SaleForm } from "@/components/sales/sale-form"

export const metadata: Metadata = {
    title: "PDV | Orbital Hub",
    description: "Ponto de Venda - Terminal de vendas",
}

interface PDVPageProps {
    searchParams: Promise<{
        customerId?: string
        serviceId?: string
        productId?: string
        eventId?: string
    }>
}

export default async function PDVPage({ searchParams }: PDVPageProps) {
    const params = await searchParams

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">Ponto de Venda</h1>
                    <p className="text-sm text-muted-foreground">
                        Terminal de vendas rápido e intuitivo
                    </p>
                </div>
            </div>

            {/* Sale Form — pré-preenchido com dados do agendamento se vindo da agenda */}
            <SaleForm
                initialCustomerId={params.customerId}
                initialServiceId={params.serviceId}
                initialProductId={params.productId}
                sourceEventId={params.eventId}
            />
        </div>
    )
}
