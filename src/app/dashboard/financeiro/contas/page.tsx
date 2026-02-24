import { getContasFinanceiras } from "@/app/actions/conta-financeira"
import { ContasBancariasClient } from "./contas-client"

export default async function ContasBancariasPage() {
    const contas = await getContasFinanceiras()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Contas Bancárias</h1>
                <p className="text-muted-foreground">Gerencie seus caixas, bancos e carteiras digitais</p>
            </div>
            <ContasBancariasClient contas={JSON.parse(JSON.stringify(contas))} />
        </div>
    )
}
