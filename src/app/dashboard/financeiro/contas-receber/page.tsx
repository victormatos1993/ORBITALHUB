import { getContasAReceber } from "@/app/actions/transaction"
import { ContasReceberClient } from "./contas-receber-client"

export default async function ContasReceberPage() {
    const contas = await getContasAReceber()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Contas a Receber</h1>
                <p className="text-muted-foreground">Receitas pendentes e parcelas de cartão</p>
            </div>
            <ContasReceberClient contas={contas} />
        </div>
    )
}
