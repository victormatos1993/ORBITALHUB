import { Metadata } from "next"
import { SaleForm } from "@/components/sales/sale-form"

export const metadata: Metadata = {
    title: "PDV | Orbital Hub",
    description: "Ponto de Venda - Terminal de vendas",
}

export default function PDVPage() {
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

            {/* Sale Form */}
            <SaleForm />
        </div>
    )
}
