import { Metadata } from "next"
import { getSupplier } from "@/app/actions/supplier"
import { getSupplierQuotes } from "@/app/actions/supplier-quote"
import { notFound } from "next/navigation"
import { SupplierDetail } from "@/components/contacts/supplier-detail"

export const metadata: Metadata = {
    title: "Fornecedor | Orbital Hub",
    description: "Detalhes do fornecedor",
}

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function SupplierDetailPage({ params }: PageProps) {
    const { id } = await params
    const [supplier, quotes] = await Promise.all([
        getSupplier(id),
        getSupplierQuotes(id),
    ])

    if (!supplier) {
        notFound()
    }

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-4 md:p-8 flex">
            <SupplierDetail supplier={supplier} quotes={quotes} />
        </div>
    )
}
