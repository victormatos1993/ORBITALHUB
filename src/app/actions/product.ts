"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Decimal } from "@prisma/client/runtime/library"
import { getTenantInfo } from "@/lib/auth-utils"

export interface ProductFilters {
    search?: string
    page?: number
    pageSize?: number
}

export async function getProducts(filters?: ProductFilters) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { products: [], total: 0 }

    try {
        const where: any = { userId: tenantId }

        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
                { sku: { contains: filters.search, mode: 'insensitive' } },
                { ncm: { contains: filters.search, mode: 'insensitive' } },
            ]
        }

        const total = await prisma.product.count({ where })
        const page = filters?.page || 1
        const pageSize = filters?.pageSize || 20
        const skip = (page - 1) * pageSize

        const products = await prisma.product.findMany({
            where,
            orderBy: { name: 'asc' },
            skip,
            take: pageSize
        })

        const serializedProducts = products.map(product => ({
            ...product,
            price: product.price.toNumber(),
            averageCost: (product as any).averageCost ? Number((product as any).averageCost) : 0,
        }))

        return {
            products: serializedProducts,
            total
        }
    } catch (error) {
        console.error("Erro ao buscar produtos:", error)
        return { products: [], total: 0 }
    }
}

export async function getProduct(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    try {
        const product = await prisma.product.findFirst({
            where: { id, userId: tenantId }
        })

        if (!product) return null

        return {
            ...product,
            price: product.price.toNumber(),
            averageCost: (product as any).averageCost ? Number((product as any).averageCost) : 0,
        }
    } catch (error) {
        console.error("Erro ao buscar produto:", error)
        return null
    }
}

export async function createProduct(data: {
    name: string
    description?: string | null
    price: number
    stockQuantity: number
    manageStock?: boolean
    ncm?: string | null
    sku?: string | null
    category?: string | null
}) {
    const { userId, tenantId } = await getTenantInfo()

    if (!tenantId) {
        return { error: "Usuário não autenticado." }
    }

    try {
        await prisma.product.create({
            data: {
                name: data.name,
                description: data.description || null,
                price: data.price,
                stockQuantity: data.stockQuantity,
                manageStock: data.manageStock ?? true,
                ncm: data.ncm || null,
                sku: data.sku || null,
                userId: tenantId,
                createdById: userId || null,
            }
        })

        revalidatePath("/dashboard/cadastros/produtos")
        return { success: true }
    } catch (error) {
        console.error("Erro ao criar produto:", error)
        return { error: `Erro ao criar produto: ${(error as Error).message}` }
    }
}

export async function updateProduct(id: string, data: {
    name: string
    description?: string | null
    price: number
    stockQuantity: number
    manageStock?: boolean
    ncm?: string | null
    sku?: string | null
}) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const product = await prisma.product.findFirst({
            where: { id, userId: tenantId }
        })

        if (!product) {
            return { error: "Produto não encontrado" }
        }

        await prisma.product.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description || null,
                price: data.price,
                stockQuantity: data.stockQuantity,
                manageStock: data.manageStock ?? true,
                ncm: data.ncm || null,
                sku: data.sku || null
            }
        })

        revalidatePath("/dashboard/cadastros/produtos")
        revalidatePath(`/dashboard/cadastros/produtos/${id}`)
        return { success: true }
    } catch (error) {
        console.error("Erro ao atualizar produto:", error)
        return { error: `Erro ao atualizar produto: ${(error as Error).message}` }
    }
}

export async function deleteProduct(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const product = await prisma.product.findFirst({
            where: { id, userId: tenantId }
        })

        if (!product) {
            return { error: "Produto não encontrado" }
        }

        await prisma.product.delete({
            where: { id }
        })

        revalidatePath("/dashboard/cadastros/produtos")
        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir produto:", error)
        return { error: "Erro ao excluir produto." }
    }
}
