
import { notFound } from "next/navigation"
import { CustomerForm } from "@/components/contacts/customer-form"
import { getCustomerDetails } from "@/app/actions/customer"

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const customer = await getCustomerDetails(id)

    if (!customer) {
        return notFound()
    }

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <CustomerForm initialData={customer} />
        </div>
    )
}
