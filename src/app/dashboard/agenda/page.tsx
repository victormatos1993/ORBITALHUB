import { Metadata } from "next"
import { AgendaContent, AgendaEvent } from "@/components/agenda/agenda-content"
import { getAgendaEvents } from "@/app/actions/agenda"
import { getProducts } from "@/app/actions/product"
import { getServices } from "@/app/actions/service"
import { getQuotes } from "@/app/actions/quote"
import { getCustomers } from "@/app/actions/customer"

export const metadata: Metadata = {
    title: "Agenda | Orbital Hub",
    description: "Gerencie seus horários, eventos e compromissos.",
}

export default async function AgendaPage() {
    const [dbEvents, productsRes, services, quotes, customersRes] = await Promise.all([
        getAgendaEvents(),
        getProducts(),
        getServices(),
        getQuotes(),
        getCustomers({ pageSize: 100 })
    ])

    const formattedEvents: AgendaEvent[] = dbEvents.map((ev: any) => ({
        id: ev.id,
        title: ev.title,
        start: ev.start,
        end: ev.end,
        type: ev.type,
        isLocal: ev.isLocal,
        location: ev.location,
        customerName: ev.customerName,
        customerId: ev.customerId,
        customerEmail: ev.customerEmail,
        customerPhone: ev.customerPhone,
        productId: ev.productId,
        serviceId: ev.serviceId,
        quoteId: ev.quoteId,
        paymentStatus: ev.paymentStatus ?? null,
        attendanceStatus: ev.attendanceStatus ?? "SCHEDULED",
    }))

    const products = productsRes.products || []
    const customers = customersRes.customers || []

    return <AgendaContent
        initialEvents={formattedEvents}
        products={products}
        services={services}
        quotes={quotes}
        customers={customers}
    />
}
