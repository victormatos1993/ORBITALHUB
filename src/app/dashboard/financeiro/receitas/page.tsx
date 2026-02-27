import { Metadata } from "next"
import { getTransactions } from "@/app/actions/transaction"
import { ReceitasClient } from "./receitas-client"

export const metadata: Metadata = {
    title: "Receitas | Orbital Hub",
    description: "Registro de todas as receitas recebidas",
}

export default async function ReceitasPage() {
    const { transactions } = await getTransactions({
        type: "income",
        status: "paid",
        pageSize: 5000,
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Receitas</h1>
                <p className="text-muted-foreground">Registro contábil de todas as receitas recebidas</p>
            </div>
            <ReceitasClient receitas={transactions} />
        </div>
    )
}
