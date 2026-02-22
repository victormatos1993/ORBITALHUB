"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { getTenantInfo } from "@/lib/auth-utils"

export async function getAgendaEvent(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    try {
        const event = await prisma.agendaEvent.findFirst({
            where: { id, userId: tenantId },
            include: {
                customer: true,
                product: true,
                service: true,
                quote: {
                    include: {
                        items: {
                            include: {
                                product: true,
                                service: true,
                            }
                        }
                    }
                }
            }
        })
        return event
    } catch (error) {
        console.error("Error fetching agenda event:", error)
        return null
    }
}

export async function getAgendaEvents() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    try {
        const events = await prisma.agendaEvent.findMany({
            where: { userId: tenantId },
            include: {
                customer: true,
                product: true,
                service: true,
                quote: true
            },
            orderBy: { startDate: "asc" }
        })

        return events.map((e: any) => ({
            id: e.id,
            title: e.title,
            start: e.startDate,
            end: e.endDate,
            type: e.type,
            isLocal: e.isLocal,
            location: e.location,
            customerName: e.customerName || e.customer?.name || null,
            customerId: e.customerId,
            customerEmail: e.customer?.email || null,
            customerPhone: e.customer?.phone || null,
            productId: e.productId,
            serviceId: e.serviceId,
            quoteId: e.quoteId
        }))
    } catch (error) {
        console.error("Error fetching agenda events:", error)
        return []
    }
}

export async function createAgendaEvent(data: {
    title: string
    type: string
    startDate: Date
    endDate: Date
    isLocal: boolean
    location?: string | null
    customerName?: string | null
    customerEmail?: string | null
    customerPhone?: string | null
    customerId?: string | null
    productId?: string | null
    serviceId?: string | null
    quoteId?: string | null
}) {
    const { userId, tenantId } = await getTenantInfo()
    if (!tenantId) return { success: false, error: "Unauthorized" }

    try {
        let finalCustomerId = data.customerId

        if (!finalCustomerId && data.customerName) {
            try {
                let existingCustomer = null

                if (data.customerPhone) {
                    existingCustomer = await prisma.customer.findFirst({
                        where: { userId: tenantId, phone: data.customerPhone }
                    })
                }

                if (!existingCustomer && data.customerEmail) {
                    existingCustomer = await prisma.customer.findFirst({
                        where: { userId: tenantId, email: data.customerEmail }
                    })
                }

                if (!existingCustomer) {
                    existingCustomer = await prisma.customer.findFirst({
                        where: { userId: tenantId, name: data.customerName }
                    })
                }

                if (existingCustomer) {
                    finalCustomerId = existingCustomer.id
                    const updateData: Record<string, string> = {}
                    if (!existingCustomer.email && data.customerEmail) updateData.email = data.customerEmail
                    if (!existingCustomer.phone && data.customerPhone) updateData.phone = data.customerPhone
                    if (Object.keys(updateData).length > 0) {
                        await prisma.customer.update({
                            where: { id: existingCustomer.id },
                            data: updateData,
                        })
                    }
                } else {
                    const newCustomer = await prisma.customer.create({
                        data: {
                            name: data.customerName,
                            email: data.customerEmail || null,
                            phone: data.customerPhone || null,
                            userId: tenantId,
                            createdById: userId,
                        }
                    })
                    finalCustomerId = newCustomer.id
                }
            } catch (err) {
                console.error("Erro ao resolver cliente na agenda:", err)
            }
        }

        const newEvent = await prisma.agendaEvent.create({
            data: {
                title: data.title,
                type: data.type,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                isLocal: data.isLocal,
                location: data.location,
                customerName: data.customerName,
                userId: tenantId,
                createdById: userId,
                ...(finalCustomerId ? { customerId: finalCustomerId } : {}),
                ...(data.productId ? { productId: data.productId } : {}),
                ...(data.serviceId ? { serviceId: data.serviceId } : {}),
                ...(data.quoteId ? { quoteId: data.quoteId } : {}),
            }
        })

        try {
            let amount = 0
            let description = `Agendamento: ${data.title}`

            if (data.quoteId) {
                const q = await prisma.quote.findFirst({ where: { id: data.quoteId, userId: tenantId } })
                if (q && q.status === "APPROVED") {
                    amount = Number(q.totalAmount)
                    description = `Serviço/Venda Orçada: ${data.title} (#${q.id.slice(-4).toUpperCase()})`
                }
            }

            if (amount === 0) {
                if (data.serviceId) {
                    const s = await prisma.service.findFirst({ where: { id: data.serviceId, userId: tenantId } })
                    if (s) {
                        amount += Number(s.price)
                        description = `Serviço Agendado: ${s.name}`
                    }
                }
                if (data.productId) {
                    const p = await prisma.product.findFirst({ where: { id: data.productId, userId: tenantId } })
                    if (p) {
                        amount += Number(p.price)
                        if (!data.serviceId) description = `Venda Agendada: ${p.name}`
                        else description += ` + ${p.name}`
                    }
                }
            }

            if (amount > 0) {
                await prisma.transaction.create({
                    data: {
                        description,
                        amount,
                        type: "income",
                        status: "pending",
                        date: new Date(data.startDate),
                        userId: tenantId,
                        createdById: userId,
                        customerId: finalCustomerId || null,
                        eventId: newEvent.id,
                        quoteId: data.quoteId || null,
                    }
                })
            }
        } catch (error) {
            console.error("Erro ao criar transação automática para agendamento:", error)
        }

        revalidatePath("/dashboard/agenda")
        revalidatePath("/dashboard/financeiro")
        return { success: true, event: newEvent }
    } catch (error) {
        console.error("Error creating agenda event:", error)
        return { success: false, error: "Failed to create event" }
    }
}

export async function deleteAgendaEvent(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { success: false, error: "Unauthorized" }

    try {
        await prisma.transaction.deleteMany({
            where: { eventId: id, userId: tenantId }
        })

        await prisma.agendaEvent.delete({
            where: { id, userId: tenantId }
        })

        revalidatePath("/dashboard/agenda")
        revalidatePath("/dashboard/financeiro")
        return { success: true }
    } catch (error) {
        console.error("Error deleting agenda event:", error)
        return { success: false, error: "Failed to delete event" }
    }
}

export async function updateAgendaEvent(id: string, data: {
    title: string
    type: string
    startDate: Date
    endDate: Date
    isLocal: boolean
    location?: string | null
    customerName?: string | null
    customerId?: string | null
    productId?: string | null
    serviceId?: string | null
    quoteId?: string | null
}) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { success: false, error: "Unauthorized" }

    try {
        const updatedEvent = await prisma.agendaEvent.update({
            where: { id, userId: tenantId },
            data: {
                title: data.title,
                type: data.type,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                isLocal: data.isLocal,
                location: data.location,
                customerName: data.customerName,
                customerId: data.customerId || null,
                productId: data.productId || null,
                serviceId: data.serviceId || null,
                quoteId: data.quoteId || null,
            }
        })

        await prisma.transaction.updateMany({
            where: { eventId: id, userId: tenantId },
            data: {
                description: `Atualizado: ${data.title}`,
                date: new Date(data.startDate),
            }
        })

        revalidatePath("/dashboard/agenda")
        revalidatePath("/dashboard/financeiro")
        return { success: true, event: updatedEvent }
    } catch (error) {
        console.error("Error updating agenda event:", error)
        return { success: false, error: "Failed to update event" }
    }
}
