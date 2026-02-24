import { getMaquinasCartao } from "@/app/actions/maquina-cartao"
import { MaquininhasClient } from "./maquininhas-client"

export default async function MaquininhasPage() {
    const maquinas = await getMaquinasCartao()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Maquininhas de Cartão</h1>
                <p className="text-muted-foreground">Configure suas maquininhas e taxas por método de pagamento</p>
            </div>
            <MaquininhasClient maquinas={JSON.parse(JSON.stringify(maquinas))} />
        </div>
    )
}
