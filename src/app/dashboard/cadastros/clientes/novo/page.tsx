import { Metadata } from "next"
import { CustomerForm } from "@/components/contacts/customer-form"

export const metadata: Metadata = {
    title: "Novo Cliente | Orbital Hub",
    description: "Adicionar novo cliente",
}

export default function NewCustomerPage() {
    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <CustomerForm />
        </div>
    )
}
