"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getTenantInfo } from "@/lib/auth-utils"

const categorySchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    type: z.enum(["income", "expense"]),
    color: z.string().optional(),
    code: z.string().optional(),
    parentId: z.string().optional().nullable(),
})

export async function createCategory(formData: z.infer<typeof categorySchema>) {
    const { userId, tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    const validatedFields = categorySchema.safeParse(formData)

    if (!validatedFields.success) {
        return { error: "Campos inválidos" }
    }

    try {
        const data = validatedFields.data
        let level = 0

        // Se tem pai, herda o nível+1
        if (data.parentId) {
            const parent = await prisma.category.findUnique({
                where: { id: data.parentId },
            })
            if (parent) level = parent.level + 1
        }

        await prisma.category.create({
            data: {
                name: data.name,
                type: data.type,
                color: data.color,
                code: data.code,
                parentId: data.parentId || null,
                level,
                isSystem: false,
                userId: tenantId,
                createdById: userId,
            },
        })

        revalidatePath("/dashboard/financeiro/categorias")
        revalidatePath("/dashboard/financeiro")
        return { success: true }
    } catch (error) {
        console.error("Failed to create category:", error)
        return { error: "Erro ao criar categoria" }
    }
}

/**
 * Retorna categorias em formato flat (compatível com uso existente).
 */
export async function getCategories() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    try {
        const categories = await prisma.category.findMany({
            where: { userId: tenantId },
            orderBy: [{ code: "asc" }, { name: "asc" }],
        })
        return categories
    } catch (error) {
        console.error("Failed to fetch categories:", error)
        return []
    }
}

/**
 * Retorna categorias em estrutura de árvore.
 */
export async function getCategoryTree() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    try {
        const all = await prisma.category.findMany({
            where: { userId: tenantId },
            include: { _count: { select: { transactions: true } } },
            orderBy: [{ code: "asc" }, { name: "asc" }],
        })

        // Montar árvore
        const roots = all.filter((c) => !c.parentId)
        return roots.map((root) => ({
            ...root,
            children: all.filter((c) => c.parentId === root.id),
        }))
    } catch (error) {
        console.error("Failed to fetch category tree:", error)
        return []
    }
}

/**
 * Garante que o plano de contas padrão existe para o tenant atual.
 * Chamado automaticamente quando o módulo financeiro é acessado.
 */
export async function ensureSystemCategories() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return

    const existingSystem = await prisma.category.findFirst({
        where: { userId: tenantId, isSystem: true },
    })

    if (existingSystem) return // Já tem plano de contas

    // Criar o plano de contas padrão
    const PLANO = [
        {
            code: "1", name: "Receitas", type: "income", color: "#10b981",
            children: [
                { code: "1.1", name: "Receitas de Vendas (Produtos)", type: "income", color: "#34d399" },
                { code: "1.2", name: "Receitas de Serviços", type: "income", color: "#6ee7b7" },
            ],
        },
        {
            code: "2", name: "Custos Variáveis", type: "expense", color: "#f59e0b",
            children: [
                { code: "2.1", name: "CMV (Custo da Mercadoria)", type: "expense", color: "#fbbf24" },
                { code: "2.2", name: "Impostos sobre Vendas", type: "expense", color: "#fcd34d" },
                { code: "2.3", name: "Taxas de Cartão / Meios de Pagamento", type: "expense", color: "#fde68a" },
                { code: "2.4", name: "Fretes e Logística", type: "expense", color: "#fef3c7" },
            ],
        },
        {
            code: "3", name: "Despesas Fixas", type: "expense", color: "#ef4444",
            children: [
                { code: "3.1", name: "Pessoal (Salários, Pró-labore)", type: "expense", color: "#f87171" },
                { code: "3.2", name: "Ocupação (Aluguel, Luz, Internet)", type: "expense", color: "#fca5a5" },
                { code: "3.3", name: "Marketing e Software (SaaS, Meta Ads)", type: "expense", color: "#fecaca" },
            ],
        },
    ]

    for (const grupo of PLANO) {
        const parent = await prisma.category.create({
            data: { code: grupo.code, name: grupo.name, type: grupo.type, color: grupo.color, level: 0, isSystem: true, userId: tenantId },
        })
        for (const child of grupo.children) {
            await prisma.category.create({
                data: { code: child.code, name: child.name, type: child.type, color: child.color, level: 1, isSystem: true, userId: tenantId, parentId: parent.id },
            })
        }
    }
}

export async function getCategory(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    try {
        const category = await prisma.category.findFirst({
            where: { id, userId: tenantId },
        })
        return category
    } catch (error) {
        return null
    }
}

export async function updateCategory(id: string, formData: z.infer<typeof categorySchema>) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    const validatedFields = categorySchema.safeParse(formData)
    if (!validatedFields.success) {
        return { error: "Campos inválidos" }
    }

    try {
        // Não alterar tipo ou código de categorias do sistema
        const existing = await prisma.category.findFirst({
            where: { id, userId: tenantId },
        })
        if (!existing) return { error: "Categoria não encontrada" }

        const data: any = { ...validatedFields.data }

        // Se é do sistema, permite apenas alterar cor e nome
        if (existing.isSystem) {
            delete data.type
            delete data.code
            delete data.parentId
        }

        let level = existing.level
        if (data.parentId && data.parentId !== existing.parentId) {
            const parent = await prisma.category.findUnique({ where: { id: data.parentId } })
            if (parent) level = parent.level + 1
        }

        await prisma.category.update({
            where: { id },
            data: { ...data, level, parentId: data.parentId || null },
        })

        revalidatePath("/dashboard/financeiro/categorias")
        return { success: true }
    } catch (error) {
        console.error("Failed to update category:", error)
        return { error: "Erro ao atualizar categoria" }
    }
}

export async function deleteCategory(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const category = await prisma.category.findFirst({
            where: { id, userId: tenantId },
            include: {
                _count: { select: { transactions: true, children: true } },
            },
        })

        if (!category) return { error: "Categoria não encontrada" }
        if (category.isSystem) return { error: "Não é possível excluir categorias do sistema" }
        if (category._count.children > 0) return { error: "Remova as subcategorias antes de excluir" }
        if (category._count.transactions > 0) return { error: "Esta categoria possui transações vinculadas" }

        await prisma.category.delete({
            where: { id },
        })

        revalidatePath("/dashboard/financeiro/categorias")
        return { success: true }
    } catch (error) {
        console.error("Failed to delete category:", error)
        return { error: "Não é possível excluir esta categoria pois ela pode estar em uso." }
    }
}
