import { Metadata } from "next"
import { AgendaListClient, AgendaEvent } from "./agenda-list-client"
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
        serviceName: ev.serviceName ?? null,
        servicePrice: ev.servicePrice ?? null,
        productName: ev.productName ?? null,
        productPrice: ev.productPrice ?? null,
        estimatedValue: ev.estimatedValue ?? 0,
    }))

    const products = productsRes.products || []
    const customers = customersRes.customers || []

    return <AgendaListClient
        initialEvents={formattedEvents}
        products={products}
        services={services}
        quotes={quotes}
        customers={customers}
    />
}
