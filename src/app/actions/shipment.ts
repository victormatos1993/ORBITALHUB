"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getTenantInfo } from "@/lib/auth-utils"

// ── Tipos ──────────────────────────────────────────────────────────
const SHIPMENT_STATUSES = [
    "PENDENTE", "SEPARANDO", "EMBALADO", "ETIQUETADO",
    "POSTADO", "EM_TRANSITO", "ENTREGUE",
] as const

type ShipmentStatus = typeof SHIPMENT_STATUSES[number]

const STATUS_LABELS: Record<string, string> = {
    PENDENTE: "Pendente",
    SEPARANDO: "Separando",
    EMBALADO: "Embalado",
    ETIQUETADO: "Etiquetado",
    POSTADO: "Postado",
    EM_TRANSITO: "Em Trânsito",
    ENTREGUE: "Entregue",
}

// Mapa de status → campo de timestamp
const STATUS_TIMESTAMP: Record<string, string> = {
    SEPARANDO: "separatedAt",
    EMBALADO: "packedAt",
    ETIQUETADO: "labeledAt",
    POSTADO: "postedAt",
    ENTREGUE: "deliveredAt",
}

// ── Dashboard KPIs ─────────────────────────────────────────────────
export async function getShipmentDashboard() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    try {
        const [pendentes, separando, prontos, postadosHoje, entreguesMes, totalEnvios] = await Promise.all([
            prisma.shipmentOrder.count({ where: { userId: tenantId, status: "PENDENTE" } }),
            prisma.shipmentOrder.count({ where: { userId: tenantId, status: "SEPARANDO" } }),
            prisma.shipmentOrder.count({ where: { userId: tenantId, status: { in: ["EMBALADO", "ETIQUETADO"] } } }),
            prisma.shipmentOrder.count({
                where: {
                    userId: tenantId,
                    status: "POSTADO",
                    postedAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lt: new Date(new Date().setHours(23, 59, 59, 999)),
                    }
                }
            }),
            prisma.shipmentOrder.count({
                where: {
                    userId: tenantId,
                    status: "ENTREGUE",
                    deliveredAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    }
                }
            }),
            prisma.shipmentOrder.count({ where: { userId: tenantId } }),
        ])

        return { pendentes, separando, prontos, postadosHoje, entreguesMes, totalEnvios }
    } catch (error) {
        console.error("Erro ao buscar dashboard logística:", error)
        return null
    }
}

// ── Listar Envios ──────────────────────────────────────────────────
export interface ShipmentFilters {
    status?: string
    search?: string
}

export async function getShipmentOrders(filters?: ShipmentFilters) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    try {
        const where: any = { userId: tenantId }

        if (filters?.status) {
            where.status = filters.status
        }

        const shipments = await prisma.shipmentOrder.findMany({
            where,
            include: {
                sale: {
                    include: {
                        customer: { select: { id: true, name: true, phone: true, city: true, state: true } },
                        items: {
                            include: {
                                product: { select: { name: true } },
                                service: { select: { name: true } },
                            }
                        },
                    }
                },
                carrier: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
        })

        return shipments.map(s => ({
            id: s.id,
            saleId: s.saleId,
            status: s.status,
            statusLabel: STATUS_LABELS[s.status] || s.status,
            trackingCode: s.trackingCode,
            shippingMethod: s.shippingMethod,
            shippingCost: s.shippingCost ? Number(s.shippingCost) : null,
            weight: s.weight ? Number(s.weight) : null,
            notes: s.notes,
            carrierName: s.carrier?.name || null,
            carrierId: s.carrierId,
            customerName: s.sale.customer?.name || "Cliente avulso",
            customerCity: s.sale.customer?.city || null,
            customerState: s.sale.customer?.state || null,
            saleTotal: Number(s.sale.totalAmount),
            saleDate: s.sale.date.toISOString(),
            itemCount: s.sale.items.length,
            itemsSummary: s.sale.items.slice(0, 3).map(i =>
                i.product?.name || i.service?.name || "Item"
            ).join(", ") + (s.sale.items.length > 3 ? ` +${s.sale.items.length - 3}` : ""),
            separatedAt: s.separatedAt?.toISOString() || null,
            packedAt: s.packedAt?.toISOString() || null,
            labeledAt: s.labeledAt?.toISOString() || null,
            postedAt: s.postedAt?.toISOString() || null,
            deliveredAt: s.deliveredAt?.toISOString() || null,
            createdAt: s.createdAt.toISOString(),
        }))
    } catch (error) {
        console.error("Erro ao buscar envios:", error)
        return []
    }
}

// ── Vendas sem envio (para criar novos envios) ─────────────────────
export async function getSalesWithoutShipment() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    try {
        const sales = await prisma.sale.findMany({
            where: {
                userId: tenantId,
                shipmentOrder: null,
            },
            include: {
                customer: { select: { name: true } },
                items: {
                    include: {
                        product: { select: { name: true } },
                        service: { select: { name: true } },
                    }
                },
            },
            orderBy: { date: "desc" },
            take: 100,
        })

        return sales.map(s => ({
            id: s.id,
            date: s.date.toISOString(),
            totalAmount: Number(s.totalAmount),
            customerName: s.customer?.name || "Cliente avulso",
            shippingCost: s.shippingCost ? Number(s.shippingCost) : null,
            itemCount: s.items.length,
            itemsSummary: s.items.slice(0, 3).map(i =>
                i.product?.name || i.service?.name || "Item"
            ).join(", "),
        }))
    } catch (error) {
        console.error("Erro ao buscar vendas sem envio:", error)
        return []
    }
}

// ── Criar Envio a partir de uma Venda ──────────────────────────────
export async function createShipmentFromSale(saleId: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const sale = await prisma.sale.findFirst({
            where: { id: saleId, userId: tenantId },
        })
        if (!sale) return { error: "Venda não encontrada" }

        // Verifica se já existe envio para esta venda
        const existing = await prisma.shipmentOrder.findUnique({ where: { saleId } })
        if (existing) return { error: "Já existe um envio para esta venda" }

        await prisma.shipmentOrder.create({
            data: {
                saleId,
                userId: tenantId,
                carrierId: sale.carrierId || null,
                shippingCost: sale.shippingCost || null,
                status: "PENDENTE",
            }
        })

        revalidatePath("/dashboard/logistica")
        return { success: true }
    } catch (error) {
        console.error("Erro ao criar envio:", error)
        return { error: `Erro ao criar envio: ${(error as Error).message}` }
    }
}

// ── Criar envios em lote ───────────────────────────────────────────
export async function createShipmentBatch(saleIds: string[]) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        let created = 0
        for (const saleId of saleIds) {
            const existing = await prisma.shipmentOrder.findUnique({ where: { saleId } })
            if (existing) continue

            const sale = await prisma.sale.findFirst({ where: { id: saleId, userId: tenantId } })
            if (!sale) continue

            await prisma.shipmentOrder.create({
                data: {
                    saleId,
                    userId: tenantId,
                    carrierId: sale.carrierId || null,
                    shippingCost: sale.shippingCost || null,
                    status: "PENDENTE",
                }
            })
            created++
        }

        revalidatePath("/dashboard/logistica")
        return { success: true, count: created }
    } catch (error) {
        console.error("Erro ao criar envios:", error)
        return { error: `Erro ao criar envios: ${(error as Error).message}` }
    }
}

// ── Avançar Status (Kanban) ────────────────────────────────────────
export async function updateShipmentStatus(id: string, newStatus: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const shipment = await prisma.shipmentOrder.findFirst({
            where: { id, userId: tenantId },
        })
        if (!shipment) return { error: "Envio não encontrado" }

        const data: any = { status: newStatus }

        // Registra timestamp do status
        const tsField = STATUS_TIMESTAMP[newStatus]
        if (tsField) {
            data[tsField] = new Date()
        }

        await prisma.shipmentOrder.update({ where: { id }, data })

        revalidatePath("/dashboard/logistica")
        return { success: true }
    } catch (error) {
        console.error("Erro ao atualizar status:", error)
        return { error: `Erro ao atualizar: ${(error as Error).message}` }
    }
}

// ── Editar Detalhes do Envio ───────────────────────────────────────
export async function updateShipmentDetails(id: string, data: {
    trackingCode?: string | null
    carrierId?: string | null
    shippingMethod?: string | null
    shippingCost?: number | null
    weight?: number | null
    notes?: string | null
}) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const shipment = await prisma.shipmentOrder.findFirst({
            where: { id, userId: tenantId },
        })
        if (!shipment) return { error: "Envio não encontrado" }

        await prisma.shipmentOrder.update({
            where: { id },
            data: {
                trackingCode: data.trackingCode ?? shipment.trackingCode,
                carrierId: data.carrierId ?? shipment.carrierId,
                shippingMethod: data.shippingMethod ?? shipment.shippingMethod,
                shippingCost: data.shippingCost !== undefined ? data.shippingCost : shipment.shippingCost,
                weight: data.weight !== undefined ? data.weight : shipment.weight,
                notes: data.notes ?? shipment.notes,
            }
        })

        revalidatePath("/dashboard/logistica")
        return { success: true }
    } catch (error) {
        console.error("Erro ao atualizar envio:", error)
        return { error: `Erro ao atualizar envio: ${(error as Error).message}` }
    }
}

// ── Excluir Envio ──────────────────────────────────────────────────
export async function deleteShipment(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const shipment = await prisma.shipmentOrder.findFirst({
            where: { id, userId: tenantId },
        })
        if (!shipment) return { error: "Envio não encontrado" }

        await prisma.shipmentOrder.delete({ where: { id } })

        revalidatePath("/dashboard/logistica")
        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir envio:", error)
        return { error: "Erro ao excluir envio" }
    }
}
