import { Metadata } from "next"
import { getProducts } from "@/app/actions/product"
import { getSuppliers } from "@/app/actions/supplier"
import { getPurchaseInvoices } from "@/app/actions/purchase-invoice"
import { EntradaMercadoriasClient } from "./entrada-client"

export const metadata: Metadata = {
    title: "Entrada de Mercadorias | Orbital Hub",
    description: "Dê entrada de mercadorias com nota fiscal",
}

export default async function EntradaMercadoriasPage() {
    const { products } = await getProducts({ pageSize: 500 })
    const { suppliers } = await getSuppliers({ pageSize: 500 })
    const { invoices } = await getPurchaseInvoices()

    return (
        <EntradaMercadoriasClient
            products={products as any}
            suppliers={suppliers as any}
            invoices={invoices as any}
        />
    )
}
