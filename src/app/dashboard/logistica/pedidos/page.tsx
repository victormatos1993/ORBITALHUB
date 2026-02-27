import { PedidosClient } from "./pedidos-client"

export default function PedidosPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Pedidos</h1>
                <p className="text-muted-foreground">Gerencie a separação e embalagem dos pedidos</p>
            </div>
            <PedidosClient />
        </div>
    )
}
