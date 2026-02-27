"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getTenantInfo } from "@/lib/auth-utils"

export interface SupplierFilters {
    search?: string
    page?: number
    pageSize?: number
}

export async function getSuppliers(filters?: SupplierFilters) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { suppliers: [], total: 0 }

    try {
        const where: any = { userId: tenantId }

        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
                { document: { contains: filters.search, mode: 'insensitive' } },
            ]
        }

        const total = await prisma.supplier.count({ where })
        const page = filters?.page || 1
        const pageSize = filters?.pageSize || 20
        const skip = (page - 1) * pageSize

        const suppliers = await prisma.supplier.findMany({
            where,
            orderBy: { name: 'asc' },
            skip,
            take: pageSize
        })

        return {
            suppliers,
            total
        }
    } catch (error) {
        console.error("Erro ao buscar fornecedores:", error)
        return { suppliers: [], total: 0 }
    }
}

export async function getSupplier(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    try {
        const supplier = await prisma.supplier.findFirst({
            where: { id, userId: tenantId }
        })
        return supplier
    } catch (error) {
        console.error("Erro ao buscar fornecedor:", error)
        return null
    }
}

export async function createSupplier(data: {
    name: string
    email?: string | null
    phone?: string | null
    document?: string | null
    supplierType?: string | null
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
        return { error: "Usuário não autenticado." }
    }

    try {
        await prisma.supplier.create({
            data: {
                name: data.name,
                email: data.email || null,
                phone: data.phone || null,
                document: data.document || null,
                supplierType: data.supplierType || null,
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

        revalidatePath("/dashboard/cadastros/fornecedores")
        return { success: true }
    } catch (error) {
        console.error("Erro ao criar fornecedor:", error)
        return { error: `Erro ao criar fornecedor: ${(error as Error).message}` }
    }
}

export async function updateSupplier(id: string, data: {
    name: string
    email?: string | null
    phone?: string | null
    document?: string | null
    supplierType?: string | null
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
        const supplier = await prisma.supplier.findFirst({
            where: { id, userId: tenantId }
        })

        if (!supplier) {
            return { error: "Fornecedor não encontrado" }
        }

        await prisma.supplier.update({
            where: { id },
            data: {
                name: data.name,
                email: data.email || null,
                phone: data.phone || null,
                document: data.document || null,
                supplierType: data.supplierType || null,
                zipCode: data.zipCode || null,
                address: data.address || null,
                number: data.number || null,
                complement: data.complement || null,
                neighborhood: data.neighborhood || null,
                city: data.city || null,
                state: data.state || null,
            }
        })

        revalidatePath("/dashboard/cadastros/fornecedores")
        revalidatePath(`/dashboard/cadastros/fornecedores/${id}`)
        return { success: true }
    } catch (error) {
        console.error("Erro ao atualizar fornecedor:", error)
        return { error: "Erro ao atualizar fornecedor" }
    }
}

export async function deleteSupplier(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const supplier = await prisma.supplier.findFirst({
            where: { id, userId: tenantId }
        })

        if (!supplier) {
            return { error: "Fornecedor não encontrado" }
        }

        await prisma.supplier.delete({
            where: { id }
        })

        revalidatePath("/dashboard/cadastros/fornecedores")
        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir fornecedor:", error)
        return { error: "Erro ao excluir fornecedor. Verifique se existem transações vinculadas." }
    }
}
