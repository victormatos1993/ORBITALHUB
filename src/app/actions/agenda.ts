"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { getTenantInfo } from "@/lib/auth-utils"
import { upsertEventNotification, markNotificationActed, reconcileNotifications } from "@/app/actions/notifications"

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

// Versão serialization-safe para usar em Client Components via Server Action
// Retorna apenas os campos necessários para o EventModal, sem tipos Decimal
export async function getAgendaEventForModal(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    try {
        const event = await prisma.agendaEvent.findFirst({
            where: { id, userId: tenantId },
            select: {
                id: true,
                title: true,
                type: true,
                startDate: true,
                endDate: true,
                isLocal: true,
                location: true,
                customerName: true,
                customerId: true,
                serviceId: true,
                productId: true,
                quoteId: true,
            }
        })
        if (!event) return null

        // Serializar Dates para ISO string — Client Component não aceita Date diretamente
        return {
            id: event.id,
            title: event.title,
            type: event.type,
            startDate: event.startDate.toISOString(),
            endDate: event.endDate.toISOString(),
            isLocal: event.isLocal,
            location: event.location,
            customerName: event.customerName,
            customerId: event.customerId,
            serviceId: event.serviceId,
            productId: event.productId,
            quoteId: event.quoteId,
        }
    } catch (error) {
        console.error("Error fetching agenda event for modal:", error)
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
            quoteId: e.quoteId,
            paymentStatus: e.paymentStatus || null,
            attendanceStatus: e.attendanceStatus || "SCHEDULED",
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
                attendanceStatus: "SCHEDULED",
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
                // Evento tem valor financeiro → marca como pendente
                await prisma.agendaEvent.update({
                    where: { id: newEvent.id },
                    data: { paymentStatus: "PENDING" }
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

// ── Atualiza o status de atendimento do evento ───────────────────────────────
// SCHEDULED | CONFIRMED | COMPLETED | CANCELLED | NO_SHOW
export async function updateAttendanceStatus(
    id: string,
    attendanceStatus: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"
) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { success: false, error: "Unauthorized" }

    try {
        const event = await prisma.agendaEvent.update({
            where: { id, userId: tenantId },
            data: { attendanceStatus },
            select: {
                id: true,
                title: true,
                customerName: true,
                customerId: true,
                paymentStatus: true,
                transactions: {
                    where: { status: "pending" },
                    select: { amount: true },
                    take: 1,
                },
            },
        })

        // ⚡ Alerta: concluído com pagamento pendente (só se havia cobrança prevista)
        if (attendanceStatus === "COMPLETED" && event.paymentStatus === "PENDING") {
            const { createPaymentAlert } = await import("@/app/actions/notifications")
            const expectedAmount = event.transactions[0]
                ? Number(event.transactions[0].amount)
                : null
            await createPaymentAlert({
                id: event.id,
                title: event.title,
                customerName: event.customerName,
                customerId: event.customerId,
                expectedAmount,
            })
        }

        revalidatePath("/dashboard/agenda")
        revalidatePath("/dashboard/financeiro")
        revalidatePath("/dashboard/notificacoes")
        return { success: true }
    } catch (error) {
        console.error("Error updating attendance status:", error)
        return { success: false, error: "Failed to update" }
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
    const { userId, tenantId } = await getTenantInfo()
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

        // Recalcular valor financeiro do agendamento
        let amount = 0
        let description = `Agendamento: ${data.title}`

        if (data.quoteId) {
            const q = await prisma.quote.findFirst({ where: { id: data.quoteId, userId: tenantId } })
            if (q) {
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

        // Buscar transação existente vinculada ao evento
        const existingTransaction = await prisma.transaction.findFirst({
            where: { eventId: id, userId: tenantId }
        })

        if (amount > 0) {
            if (existingTransaction) {
                // Atualizar valor, descrição e data
                await prisma.transaction.update({
                    where: { id: existingTransaction.id },
                    data: {
                        description,
                        amount,
                        date: new Date(data.startDate),
                        customerId: data.customerId || null,
                        quoteId: data.quoteId || null,
                    }
                })
            } else {
                // Evento que antes não tinha valor e agora tem: criar transação
                await prisma.transaction.create({
                    data: {
                        description,
                        amount,
                        type: "income",
                        status: "pending",
                        date: new Date(data.startDate),
                        userId: tenantId,
                        createdById: userId,
                        customerId: data.customerId || null,
                        eventId: id,
                        quoteId: data.quoteId || null,
                    }
                })
            }
        } else if (existingTransaction) {
            // Evento perdeu valor financeiro (serviço/produto removido): apagar transação
            await prisma.transaction.delete({ where: { id: existingTransaction.id } })
        }

        revalidatePath("/dashboard/agenda")
        revalidatePath("/dashboard/financeiro")
        revalidatePath("/dashboard/financeiro/transacoes")
        return { success: true, event: updatedEvent }
    } catch (error) {
        console.error("Error updating agenda event:", error)
        return { success: false, error: "Failed to update event" }
    }
}

/**
 * Retorna TODOS os eventos cujo horário de início já passou e que ainda precisam de ação:
 * - Eventos com transação de receita pendente (para confirmar e faturar), OU
 * - Eventos sem transação nenhuma (para o usuário cobrar manualmente ou cancelar)
 * Exclui eventos puramente pessoais sem cliente nem item financeiro.
 */
export async function getDueEvents() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    const now = new Date()

    try {
        // Reconcilia notificações antes de filtrar — corrige casos onde a ação ocorreu antes do sistema
        await reconcileNotifications(tenantId)

        const events = await prisma.agendaEvent.findMany({
            where: {
                userId: tenantId,
                startDate: { lte: now },
                notificationStatus: null, // null = não atuado, ainda no sino
                // Ignora eventos já encerrados operacionalmente
                attendanceStatus: { notIn: ["COMPLETED", "CANCELLED", "NO_SHOW"] },
                OR: [
                    // Caso 1: Tem transação de receita PENDENTE
                    { transactions: { some: { status: "pending", type: "income" } } },
                    // Caso 2: Tem cliente/serviço/produto mas SEM nenhuma transação
                    // e sem paymentStatus definido (= sem cobrança configurada)
                    {
                        transactions: { none: {} },
                        paymentStatus: null, // sem cobrança = sem valor a receber
                        OR: [
                            { customerId: { not: null } },
                            { serviceId: { not: null } },
                            { productId: { not: null } },
                            { quoteId: { not: null } },
                            { customerName: { not: null } },
                        ]
                    }
                ]
            },
            include: {
                customer: { select: { name: true, phone: true } },
                service: { select: { name: true, price: true } },
                product: { select: { name: true, price: true } },
                transactions: {
                    where: { status: "pending", type: "income" },
                    select: { id: true, amount: true, description: true }
                }
            },
            orderBy: { startDate: "asc" }
        })

        const results = events.map(e => ({
            id: e.id,
            title: e.title,
            startDate: e.startDate.toISOString(),
            customerName: e.customerName || e.customer?.name || null,
            customerPhone: e.customer?.phone || null,
            customerId: e.customerId || null,
            serviceId: e.serviceId || null,
            productId: e.productId || null,
            serviceName: e.service?.name || null,
            productName: e.product?.name || null,
            transactionId: e.transactions[0]?.id || null,
            amount: Number(e.transactions[0]?.amount || 0),
            hasPendingTransaction: e.transactions.length > 0,
        }))

        // Persiste cada evento pendente na Central de Notificações
        await Promise.allSettled(
            results.map(r =>
                upsertEventNotification({
                    id: r.id,
                    title: r.title,
                    customerName: r.customerName,
                    customerId: r.customerId,
                    expectedAmount: r.amount > 0 ? r.amount : undefined,
                    startDate: r.startDate,
                })
            )
        )

        return results
    } catch (error) {
        console.error("Erro ao buscar eventos pendentes:", error)
        return []
    }
}

/**
 * Confirma o atendimento: marca a transação vinculada como paga.
 */
export async function confirmEventAttendance(eventId: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { success: false, error: "Unauthorized" }

    try {
        const transaction = await prisma.transaction.findFirst({
            where: { eventId, userId: tenantId, status: "pending", type: "income" }
        })

        if (!transaction) {
            return { success: false, error: "Transação não encontrada ou já processada" }
        }

        await prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: "paid", date: new Date() }
        })

        // Grava o status de atuação diretamente no evento (fonte de verdade)
        await prisma.agendaEvent.update({
            where: { id: eventId },
            data: {
                notificationStatus: "CONFIRMED",
                notificationActedAt: new Date(),
            },
        })

        // Sincroniza com a Central de Notificações
        await markNotificationActed(eventId, "CONFIRMED", Number(transaction.amount))

        revalidatePath("/dashboard/agenda")
        revalidatePath("/dashboard/financeiro")
        revalidatePath("/dashboard/financeiro/transacoes")
        revalidatePath("/dashboard/notificacoes")
        return { success: true }
    } catch (error) {
        console.error("Erro ao confirmar atendimento:", error)
        return { success: false, error: "Falha ao confirmar atendimento" }
    }
}

/**
 * Cancela o agendamento e remove a transação pendente vinculada.
 */
export async function cancelEventAndTransaction(eventId: string) {
    // Grava o status de atuação no evento antes de deletar
    try {
        await prisma.agendaEvent.update({
            where: { id: eventId },
            data: {
                notificationStatus: "CANCELLED",
                notificationActedAt: new Date(),
            },
        })
    } catch { /* evento pode não existir, ignora */ }

    await markNotificationActed(eventId, "CANCELLED")
    return deleteAgendaEvent(eventId)
}
