import { Metadata } from "next"
import { SupplierForm } from "@/components/contacts/supplier-form"

export const metadata: Metadata = {
    title: "Novo Fornecedor | Orbital Hub",
    description: "Adicionar novo fornecedor",
}

export default function NewSupplierPage() {
    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <SupplierForm />
        </div>
    )
}
