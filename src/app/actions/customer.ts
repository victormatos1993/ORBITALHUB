"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getTenantInfo } from "@/lib/auth-utils"

export interface CustomerFilters {
    search?: string
    page?: number
    pageSize?: number
}

export async function getCustomers(filters?: CustomerFilters) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { customers: [], total: 0 }

    try {
        const where: any = { userId: tenantId }

        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
                { document: { contains: filters.search, mode: 'insensitive' } },
                { phone: { contains: filters.search, mode: 'insensitive' } },
            ]
        }

        const total = await prisma.customer.count({ where })
        console.log(`[getCustomers] Tenant: ${tenantId}, Search: "${filters?.search}", Count: ${total}`)

        const page = filters?.page || 1
        const pageSize = filters?.pageSize || 20
        const skip = (page - 1) * pageSize

        const customers = await prisma.customer.findMany({
            where,
            orderBy: { name: 'asc' },
            skip,
            take: pageSize,
            include: {
                sales: {
                    orderBy: { date: 'desc' },
                    take: 1,
                    select: { date: true }
                }
            }
        })
        console.log(`[getCustomers] Found ${customers.length} customers`)

        const formattedCustomers = customers.map(c => ({
            ...c,
            lastSaleDate: c.sales[0]?.date || null
        }))

        return {
            customers: formattedCustomers,
            total
        }
    } catch (error) {
        console.error("Erro ao buscar clientes:", error)
        return { customers: [], total: 0 }
    }
}

export async function getCustomer(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    try {
        const customer = await prisma.customer.findFirst({
            where: { id, userId: tenantId }
        })
        return customer
    } catch (error) {
        console.error("Erro ao buscar cliente:", error)
        return null
    }
}

import { Prisma } from "@prisma/client"

type CustomerWithRelations = Prisma.CustomerGetPayload<{
    include: {
        sales: {
            include: {
                items: { include: { product: true } }
            }
        }
        transactions: true
    }
}> & {
    quotes: Prisma.QuoteGetPayload<{ include: { items: true } }>[]
    events: Prisma.AgendaEventGetPayload<{}>[]
}

export async function getCustomerDetails(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    try {
        const customer = await prisma.customer.findFirst({
            where: { id, userId: tenantId },
            include: {
                sales: {
                    orderBy: { date: 'desc' },
                    take: 50, // Limit history for performance, or implement pagination later
                    include: {
                        items: { include: { product: true } }
                    }
                },
                transactions: {
                    orderBy: { date: 'desc' },
                    take: 50
                }
            }
        })

        if (!customer) return null

        const quotes = await prisma.quote.findMany({
            where: { userId: tenantId, clientName: customer.name },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { items: true }
        })

        const events = await prisma.agendaEvent.findMany({
            where: {
                userId: tenantId,
                OR: [
                    { customerId: customer.id },
                    { customerName: customer.name }
                ]
            },
            orderBy: { startDate: 'desc' },
            take: 20
        })

        // Calculate stats
        const totalPurchases = customer.sales.length
        const totalSpent = customer.sales.reduce((acc, sale) => acc + Number(sale.totalAmount), 0)

        // Receita prevista de transações agendadas (pendentes)
        const scheduledRevenue = customer.transactions
            .filter(t => t.status === "pending" && t.type === "income")
            .reduce((acc, t) => acc + Number(t.amount), 0)

        const lastPurchase = customer.sales[0]?.date || null
        const averageTicket = totalPurchases > 0 ? totalSpent / totalPurchases : 0

        return {
            ...customer,
            quotes,
            events,
            stats: {
                totalPurchases,
                totalSpent,
                scheduledRevenue,
                lastPurchase,
                averageTicket
            }
        } as CustomerWithRelations & {
            stats: {
                totalPurchases: number
                totalSpent: number
                scheduledRevenue: number
                lastPurchase: Date | null
                averageTicket: number
            }
        }
    } catch (error) {
        console.error("Erro ao buscar detalhes do cliente:", error)
        return null
    }
}

export async function createCustomer(data: {
    name: string
    email?: string | null
    phone?: string | null
    document?: string | null
    zipCode?: string | null
    address?: string | null
    number?: string | null
    complement?: string | null
    neighborhood?: string | null
    city?: string | null
    state?: string | null
}) {
    const { userId, tenantId } = await getTenantInfo()

    if (!tenantId) {
        return { error: "Usuário não autenticado ou ID de usuário não encontrado." }
    }

    try {
        const customer = await prisma.customer.create({
            data: {
                name: data.name,
                email: data.email || null,
                phone: data.phone || null,
                document: data.document || null,
                zipCode: data.zipCode || null,
                address: data.address || null,
                number: data.number || null,
                complement: data.complement || null,
                neighborhood: data.neighborhood || null,
                city: data.city || null,
                state: data.state || null,
                userId: tenantId,
                createdById: userId || null,
            }
        })

        revalidatePath("/dashboard/cadastros/clientes")
        return { success: true, customer: { id: customer.id, name: customer.name, document: customer.document, email: customer.email, phone: customer.phone } }
    } catch (error) {
        console.error("Erro ao criar cliente:", error)
        return { error: `Erro ao criar cliente: ${(error as Error).message}` }
    }
}

export async function updateCustomer(id: string, data: {
    name: string
    email?: string | null
    phone?: string | null
    document?: string | null
    zipCode?: string | null
    address?: string | null
    number?: string | null
    complement?: string | null
    neighborhood?: string | null
    city?: string | null
    state?: string | null
}) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const customer = await prisma.customer.findFirst({
            where: { id, userId: tenantId }
        })

        if (!customer) {
            return { error: "Cliente não encontrado" }
        }

        await prisma.customer.update({
            where: { id },
            data: {
                name: data.name,
                email: data.email || null,
                phone: data.phone || null,
                document: data.document || null,
                zipCode: data.zipCode || null,
                address: data.address || null,
                number: data.number || null,
                complement: data.complement || null,
                neighborhood: data.neighborhood || null,
                city: data.city || null,
                state: data.state || null,
            }
        })

        revalidatePath("/dashboard/cadastros/clientes")
        revalidatePath(`/dashboard/cadastros/clientes/${id}`)
        return { success: true }
    } catch (error) {
        console.error("Erro ao atualizar cliente:", error)
        return { error: "Erro ao atualizar cliente" }
    }
}

export async function deleteCustomer(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const customer = await prisma.customer.findFirst({
            where: { id, userId: tenantId }
        })

        if (!customer) {
            return { error: "Cliente não encontrado" }
        }

        await prisma.customer.delete({
            where: { id }
        })

        revalidatePath("/dashboard/cadastros/clientes")
        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir cliente:", error)
        return { error: "Erro ao excluir cliente. Verifique se existem transações vinculadas." }
    }
}
