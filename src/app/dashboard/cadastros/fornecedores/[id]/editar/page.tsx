import { Metadata } from "next"
import { SupplierForm } from "@/components/contacts/supplier-form"
import { getSupplier } from "@/app/actions/supplier"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
    title: "Editar Fornecedor | Orbital Hub",
    description: "Editar cadastro de fornecedor",
}

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditSupplierPage({ params }: PageProps) {
    const { id } = await params
    const supplier = await getSupplier(id)

    if (!supplier) {
        notFound()
    }

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <SupplierForm initialData={supplier} />
        </div>
    )
}
