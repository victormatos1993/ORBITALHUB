import { getContasFinanceiras } from "@/app/actions/conta-financeira"
import { ContasBancariasClient } from "./contas-client"

export default async function ContasBancariasPage() {
    const contas = await getContasFinanceiras()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Contas e Cartões</h1>
                <p className="text-muted-foreground">Gerencie suas contas de recebimento, pagamento e cartões de crédito</p>
            </div>
            <ContasBancariasClient contas={JSON.parse(JSON.stringify(contas))} />
        </div>
    )
}
