"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Decimal } from "@prisma/client/runtime/library"
import { getTenantInfo } from "@/lib/auth-utils"

export interface ProductFilters {
    search?: string
    productType?: string
    availableForSale?: boolean
    page?: number
    pageSize?: number
}

export async function getProducts(filters?: ProductFilters) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { products: [], total: 0 }

    try {
        const where: any = { userId: tenantId }

        if (filters?.productType) {
            where.productType = filters.productType
        }

        if (filters?.availableForSale !== undefined) {
            where.availableForSale = filters.availableForSale
        }

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
            productType: (product as any).productType || "VENDA",
            department: (product as any).department || null,
            availableForSale: (product as any).availableForSale ?? false,
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
            productType: (product as any).productType || "VENDA",
            department: (product as any).department || null,
            availableForSale: (product as any).availableForSale ?? false,
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
    productType?: string
    department?: string | null
    availableForSale?: boolean
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
                productType: data.productType || "VENDA",
                department: data.department || null,
                availableForSale: data.availableForSale ?? false,
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
    productType?: string
    department?: string | null
    availableForSale?: boolean
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

        const oldType = (product as any).productType || "VENDA"
        const newType = data.productType || "VENDA"
        const isBecomingInternal = oldType === "VENDA" && newType === "INTERNO"

        await prisma.product.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description || null,
                price: data.price,
                stockQuantity: data.stockQuantity,
                manageStock: data.manageStock ?? true,
                ncm: data.ncm || null,
                sku: data.sku || null,
                productType: newType,
                department: data.department || null,
                availableForSale: newType === "INTERNO" ? false : (data.availableForSale ?? false),
                // Zerar custo médio se virou interno (não é mais para revenda)
                ...(isBecomingInternal ? { averageCost: 0 } : {}),
            }
        })

        // ── Migrar CMV → Despesa Operacional se mudou VENDA → INTERNO ──
        if (isBecomingInternal) {
            const department = data.department || "ADMINISTRATIVO"

            // Mapear departamento → código de categoria operacional
            const categoryMap: Record<string, { code: string; name: string }> = {
                LOGISTICA: { code: "2.4", name: "Frete" },
                ADMINISTRATIVO: { code: "3", name: "Despesas Fixas / Operacionais" },
                MANUTENCAO: { code: "3", name: "Despesas Fixas / Operacionais" },
            }
            const target = categoryMap[department] || categoryMap.ADMINISTRATIVO

            // Buscar categoria destino
            let destCategory = await prisma.category.findFirst({
                where: { userId: tenantId, code: target.code, isSystem: true },
            })
            if (!destCategory) {
                destCategory = await prisma.category.findFirst({
                    where: { userId: tenantId, code: target.code },
                })
            }

            if (destCategory) {
                // Buscar todas as vendas que contêm este produto
                const saleItems = await prisma.saleItem.findMany({
                    where: { productId: id },
                    select: { saleId: true },
                })
                const saleIds = [...new Set(saleItems.map(si => si.saleId))]

                if (saleIds.length > 0) {
                    // Buscar categoria CMV
                    const cmvCategory = await prisma.category.findFirst({
                        where: { userId: tenantId, code: "2.1", isSystem: true },
                    })

                    if (cmvCategory) {
                        // Migrar transações CMV deste produto para a categoria operacional
                        const result = await prisma.transaction.updateMany({
                            where: {
                                userId: tenantId,
                                saleId: { in: saleIds },
                                categoryId: cmvCategory.id,
                                description: { contains: product.name },
                            },
                            data: {
                                categoryId: destCategory.id,
                            },
                        })

                        if (result.count > 0) {
                            console.log(`✅ Migradas ${result.count} transações CMV de "${product.name}" para "${target.name}" (${target.code})`)
                        }
                    }
                }

                // Migrar transações de compra (NF entrada) também
                const stockEntries = await prisma.stockEntry.findMany({
                    where: { productId: id },
                    select: { purchaseInvoiceId: true },
                })
                const invoiceIds = [...new Set(stockEntries.map(se => se.purchaseInvoiceId))]

                if (invoiceIds.length > 0) {
                    const cmvCategory = await prisma.category.findFirst({
                        where: { userId: tenantId, code: "2.1", isSystem: true },
                    })

                    if (cmvCategory) {
                        const result = await prisma.transaction.updateMany({
                            where: {
                                userId: tenantId,
                                purchaseInvoiceId: { in: invoiceIds },
                                categoryId: cmvCategory.id,
                            },
                            data: {
                                categoryId: destCategory.id,
                            },
                        })

                        if (result.count > 0) {
                            console.log(`✅ Migradas ${result.count} transações de compra de "${product.name}" para "${target.name}" (${target.code})`)
                        }
                    }
                }
            }
        }

        revalidatePath("/dashboard/cadastros/produtos")
        revalidatePath(`/dashboard/cadastros/produtos/${id}`)
        revalidatePath("/dashboard/financeiro/transacoes")
        revalidatePath("/dashboard/financeiro/contas-pagar")
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
