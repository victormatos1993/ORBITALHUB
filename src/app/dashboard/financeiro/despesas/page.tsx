import { Metadata } from "next"
import { getTransactions } from "@/app/actions/transaction"
import { DespesasClient } from "./despesas-client"

export const metadata: Metadata = {
    title: "Despesas Pagas | Orbital Hub",
    description: "Registro de todas as despesas pagas",
}

export default async function DespesasPage() {
    const { transactions } = await getTransactions({
        type: "expense",
        status: "paid",
        pageSize: 5000,
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Despesas Pagas</h1>
                <p className="text-muted-foreground">Registro contábil de todas as despesas efetivadas</p>
            </div>
            <DespesasClient despesas={transactions} />
        </div>
    )
}
