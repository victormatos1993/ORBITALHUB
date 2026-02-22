"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getTenantInfo } from "@/lib/auth-utils"

const categorySchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    type: z.enum(["income", "expense"]),
    color: z.string().optional(),
})

export async function createCategory(formData: z.infer<typeof categorySchema>) {
    const { userId, tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    const validatedFields = categorySchema.safeParse(formData)

    if (!validatedFields.success) {
        return { error: "Campos inválidos" }
    }

    try {
        await prisma.category.create({
            data: {
                ...validatedFields.data,
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

export async function getCategories() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    try {
        const categories = await prisma.category.findMany({
            where: { userId: tenantId },
            orderBy: { name: 'asc' }
        })
        return categories
    } catch (error) {
        console.error("Failed to fetch categories:", error)
        return []
    }
}

export async function getCategory(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    try {
        const category = await prisma.category.findUnique({
            where: { id, userId: tenantId }
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
        await prisma.category.update({
            where: { id, userId: tenantId },
            data: validatedFields.data
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
        await prisma.category.delete({
            where: { id, userId: tenantId }
        })

        revalidatePath("/dashboard/financeiro/categorias")
        return { success: true }
    } catch (error) {
        console.error("Failed to delete category:", error)
        return { error: "Não é possível excluir esta categoria pois ela pode estar em uso." }
    }
}
