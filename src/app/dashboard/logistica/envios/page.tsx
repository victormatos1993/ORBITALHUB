import { EnviosClient } from "./envios-client"

export default function EnviosPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Envios</h1>
                <p className="text-muted-foreground">Acompanhe o rastreio e entrega dos pedidos</p>
            </div>
            <EnviosClient />
        </div>
    )
}
