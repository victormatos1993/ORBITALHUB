import { notFound } from "next/navigation"
import { getSale } from "@/app/actions/sales"
import { getCompany } from "@/app/actions/company"
import { InvoiceView } from "@/components/sales/invoice-view"

export default async function SaleInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const sale = await getSale(id)

    if (!sale) {
        return notFound()
    }

    const companyRes = await getCompany()
    const company = companyRes?.data || null

    return <InvoiceView sale={sale} company={company} />
}
