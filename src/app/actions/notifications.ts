"use server"

import { prisma } from "@/lib/prisma"
import { getTenantInfo } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { startOfDay, endOfDay, format } from "date-fns"
import { ptBR } from "date-fns/locale"

// ─── Status constants ──────────────────────────────────────────────────────────
export type NotificationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "ACTED_PDV" | "DISMISSED"

// ─── Cria alerta: evento concluído mas pagamento pendente ─────────────────────
// Chamado internamente por updateAttendanceStatus quando COMPLETED + paymentStatus=PENDING
export async function createPaymentAlert(event: {
    id: string
    title: string
    customerName: string | null
    customerId: string | null
    expectedAmount?: number | null
}) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return

    // Usa upsert — evita duplicatas se o usuário marcar como concluído mais de uma vez
    await prisma.notification.upsert({
        where: { userId_eventId: { userId: tenantId, eventId: `pay_alert_${event.id}` } },
        create: {
            userId: tenantId,
            type: "PAYMENT_ALERT",
            title: event.title,
            description: event.customerName
                ? `Serviço concluído com ${event.customerName} — pagamento não registrado. Fature pelo PDV.`
                : "Serviço concluído sem pagamento registrado. Fature pelo PDV.",
            eventId: `pay_alert_${event.id}`,   // chave única derivada do evento
            customerId: event.customerId,
            customerName: event.customerName,
            expectedAmount: event.expectedAmount ?? null,
            status: "PENDING",
            dueAt: new Date(),
        },
        update: {
            // Recria a descrição mas não altera status se já foi dispensado
            description: event.customerName
                ? `Serviço concluído com ${event.customerName} — pagamento não registrado. Fature pelo PDV.`
                : "Serviço concluído sem pagamento registrado. Fature pelo PDV.",
        },
    })

    revalidatePath("/dashboard/notificacoes")
}

// ─── Busca alertas de pagamento PENDING para o bell do header ─────────────────
export async function getPaymentAlerts() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    const alerts = await prisma.notification.findMany({
        where: {
            userId: tenantId,
            type: "PAYMENT_ALERT",
            status: "PENDING",
        },
        orderBy: { createdAt: "desc" },
    })

    if (alerts.length === 0) return []

    // ── Lookup único: reconciliação + enriquecimento com serviceId/productId ──
    const realEventIds = alerts
        .map(a => a.eventId?.replace("pay_alert_", ""))
        .filter(Boolean) as string[]

    const events = await prisma.agendaEvent.findMany({
        where: { id: { in: realEventIds } },
        select: {
            id: true,
            paymentStatus: true,
            serviceId: true,
            productId: true,
            transactions: {
                where: { status: "paid", type: "income" },
                select: { amount: true },
                take: 1,
            },
        },
    })

    const eventMap = new Map(events.map(e => [e.id, e]))

    const toDiscard = alerts.filter(a => {
        const e = eventMap.get(a.eventId?.replace("pay_alert_", "") ?? "")
        return e?.paymentStatus === "PAID"
    })

    if (toDiscard.length > 0) {
        // Atualiza individualmente para gravar o valor de cada transação
        await Promise.allSettled(
            toDiscard.map(a => {
                const realId = a.eventId?.replace("pay_alert_", "") ?? ""
                const ev = eventMap.get(realId)
                const amount = ev?.transactions?.[0]?.amount
                    ? Number(ev.transactions[0].amount)
                    : null
                return prisma.notification.update({
                    where: { id: a.id },
                    data: {
                        status: amount ? "ACTED_PDV" : "DISMISSED",
                        actionAmount: amount,
                        actionAt: new Date(),
                    },
                })
            })
        )
    }

    const active = alerts.filter(a => {
        const e = eventMap.get(a.eventId?.replace("pay_alert_", "") ?? "")
        return !e || e.paymentStatus !== "PAID"
    })

    return active.map(a => {
        const realId = a.eventId?.replace("pay_alert_", "") ?? null
        const ev = realId ? eventMap.get(realId) : undefined
        return {
            id: a.id,
            title: a.title,
            description: a.description,
            customerName: a.customerName,
            customerId: a.customerId,
            eventId: a.eventId,
            realEventId: realId,
            serviceId: ev?.serviceId ?? null,
            productId: ev?.productId ?? null,
            expectedAmount: a.expectedAmount ? Number(a.expectedAmount) : null,
            createdAt: a.createdAt,
        }
    })
}

// ─── Dispensa um alerta de pagamento (DISMISSED) ──────────────────────────────
export async function dismissPaymentAlert(notificationId: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { success: false }
    try {
        await prisma.notification.update({
            where: { id: notificationId, userId: tenantId },
            data: { status: "DISMISSED", actionAt: new Date() },
        })
        revalidatePath("/dashboard/notificacoes")
        return { success: true }
    } catch {
        return { success: false }
    }
}


// ─── Reconciliation ─────────────────────────────────────────────────────────────
// Corrige automaticamente notificações PENDING cujo evento já foi faturado/pago no banco.
// Resolve casos onde a ação aconteceu antes da Central de Notificações existir.
export async function reconcileNotifications(tenantId: string) {
    // Busca todas notificações PENDING com eventId
    const pendingWithEvent = await prisma.notification.findMany({
        where: {
            userId: tenantId,
            status: "PENDING",
            eventId: { not: null },
        },
        select: { id: true, eventId: true },
    })

    if (pendingWithEvent.length === 0) return

    const eventIds = pendingWithEvent.map(n => n.eventId!).filter(Boolean)

    // Busca transações pagas vinculadas a esses eventos
    const paidTransactions = await prisma.transaction.findMany({
        where: {
            userId: tenantId,
            eventId: { in: eventIds },
            type: "income",
            status: "paid",
        },
        select: { eventId: true, amount: true, date: true },
    })

    if (paidTransactions.length === 0) return

    const paidByEvent = new Map(
        paidTransactions.map(t => [t.eventId!, t])
    )

    // Atualiza em lote as notificações que têm transação paga
    const toUpdate = pendingWithEvent.filter(n => paidByEvent.has(n.eventId!))
    await Promise.allSettled(
        toUpdate.map(n => {
            const tx = paidByEvent.get(n.eventId!)!
            return prisma.notification.update({
                where: { id: n.id },
                data: {
                    status: "CONFIRMED",
                    actionAmount: tx.amount,
                    actionAt: tx.date ?? new Date(),
                },
            })
        })
    )

    if (toUpdate.length > 0) {
        revalidatePath("/dashboard/notificacoes")
    }
}

// ─── Upsert notification for a due agenda event ────────────────────────────────
export async function upsertEventNotification(event: {
    id: string
    title: string
    customerName: string | null
    customerId: string | null
    expectedAmount?: number
    startDate: string // ISO
}) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return

    await prisma.notification.upsert({
        where: { userId_eventId: { userId: tenantId, eventId: event.id } },
        create: {
            userId: tenantId,
            type: "AGENDA_EVENT",
            title: event.title,
            description: event.customerName
                ? `Atendimento com ${event.customerName}`
                : "Atendimento sem cliente vinculado",
            eventId: event.id,
            customerId: event.customerId,
            customerName: event.customerName,
            expectedAmount: event.expectedAmount ?? null,
            status: "PENDING",
            dueAt: new Date(event.startDate),
        },
        update: {
            // Só atualiza metadados — NÃO sobrescreve status (evita reverter CONFIRMED → PENDING)
            title: event.title,
            customerName: event.customerName,
            expectedAmount: event.expectedAmount ?? null,
            dueAt: new Date(event.startDate),
        },
    })
}

// ─── Mark a notification as acted ─────────────────────────────────────────────
export async function markNotificationActed(
    eventId: string,
    status: "CONFIRMED" | "CANCELLED" | "ACTED_PDV" | "DISMISSED",
    actionAmount?: number
) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { success: false }

    try {
        // Se a notificação ainda não existir, cria com status correto
        const notification = await prisma.notification.findFirst({
            where: { userId: tenantId, eventId },
        })

        if (notification) {
            await prisma.notification.update({
                where: { id: notification.id },
                data: {
                    status,
                    actionAmount: actionAmount ?? null,
                    actionAt: new Date(),
                },
            })
        }
        // Se não existir registro, a reconciliação cuidará disso na próxima chamada

        revalidatePath("/dashboard/notificacoes")
        return { success: true }
    } catch (error) {
        console.error("Erro ao marcar notificação:", error)
        return { success: false }
    }
}

// ─── Delete a notification ─────────────────────────────────────────────────────
export async function deleteNotification(notificationId: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { success: false }

    try {
        await prisma.notification.delete({
            where: { id: notificationId, userId: tenantId },
        })
        revalidatePath("/dashboard/notificacoes")
        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir notificação:", error)
        return { success: false }
    }
}

// ─── Get all notifications (for the central) ──────────────────────────────────
export async function getNotifications(filters?: {
    status?: NotificationStatus | "ALL"
    date?: Date
}) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    // Reconcilia antes de retornar — corrige inconsistências com o mundo real
    await reconcileNotifications(tenantId)

    const where: Record<string, unknown> = { userId: tenantId }

    if (filters?.status && filters.status !== "ALL") {
        where.status = filters.status
    }

    if (filters?.date) {
        where.dueAt = {
            gte: startOfDay(filters.date),
            lte: endOfDay(filters.date),
        }
    }

    const notifications = await prisma.notification.findMany({
        where,
        orderBy: { dueAt: "desc" },
    })

    return notifications.map(n => ({
        ...n,
        expectedAmount: n.expectedAmount ? Number(n.expectedAmount) : null,
        actionAmount: n.actionAmount ? Number(n.actionAmount) : null,
    }))
}

// ─── Daily summary (intelligent) ──────────────────────────────────────────────
export async function getDailySummary(date?: Date) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    // Reconcilia antes de gerar o resumo
    await reconcileNotifications(tenantId)

    const target = date ?? new Date()

    const notifications = await prisma.notification.findMany({
        where: {
            userId: tenantId,
            dueAt: {
                gte: startOfDay(target),
                lte: endOfDay(target),
            },
        },
    })

    if (notifications.length === 0) return null

    const total = notifications.length
    const confirmed = notifications.filter(n => n.status === "CONFIRMED")
    const actedPDV = notifications.filter(n => n.status === "ACTED_PDV")
    const cancelled = notifications.filter(n => n.status === "CANCELLED")
    const pending = notifications.filter(n => n.status === "PENDING")
    const dismissed = notifications.filter(n => n.status === "DISMISSED")

    const acted = confirmed.length + actedPDV.length
    const billed = [...confirmed, ...actedPDV]

    const totalExpected = notifications.reduce((s, n) => s + Number(n.expectedAmount || 0), 0)
    const totalBilled = billed.reduce((s, n) => s + Number(n.actionAmount || n.expectedAmount || 0), 0)

    const actionRate = total > 0 ? Math.round((acted / total) * 100) : 0

    // Gera textos inteligentes
    const highlights: string[] = []

    if (pending.length === 0 && total > 0) {
        highlights.push("✅ Todos os atendimentos foram atuados hoje!")
    } else if (pending.length > 0) {
        highlights.push(`⚠️ ${pending.length} atendimento${pending.length > 1 ? "s" : ""} ainda sem retorno`)
    }

    if (cancelled.length > 0) {
        const rate = Math.round((cancelled.length / total) * 100)
        highlights.push(`🚫 ${cancelled.length} cancelamento${cancelled.length > 1 ? "s" : ""} (${rate}% do total)`)
    }

    if (actedPDV.length > 0) {
        highlights.push(`🛒 ${actedPDV.length} venda${actedPDV.length > 1 ? "s" : ""} finalizada${actedPDV.length > 1 ? "s" : ""} pelo PDV`)
    }

    if (confirmed.length > 0) {
        highlights.push(`✔️ ${confirmed.length} atendimento${confirmed.length > 1 ? "s" : ""} confirmado${confirmed.length > 1 ? "s" : ""} e faturado${confirmed.length > 1 ? "s" : ""}`)
    }

    if (totalBilled > 0 && totalExpected > 0) {
        const conversionRate = Math.round((totalBilled / totalExpected) * 100)
        highlights.push(`💰 Taxa de conversão financeira: ${conversionRate}%`)
    }

    if (dismissed.length > 0) {
        highlights.push(`👋 ${dismissed.length} dispensado${dismissed.length > 1 ? "s" : ""} sem ação`)
    }

    return {
        date: format(target, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
        total,
        pending: pending.length,
        acted,
        confirmed: confirmed.length,
        actedPDV: actedPDV.length,
        cancelled: cancelled.length,
        dismissed: dismissed.length,
        actionRate,
        totalExpected,
        totalBilled,
        highlights,
        notifications: notifications.map(n => ({
            ...n,
            expectedAmount: n.expectedAmount ? Number(n.expectedAmount) : null,
            actionAmount: n.actionAmount ? Number(n.actionAmount) : null,
        })),
    }
}
