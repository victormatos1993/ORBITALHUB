"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getTenantInfo } from "@/lib/auth-utils"

export async function getServices() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    const services = await prisma.service.findMany({
        where: { userId: tenantId },
        orderBy: { name: "asc" },
    })
    return services.map(s => ({
        ...s,
        price: Number(s.price),
    }))
}

export async function createService(data: {
    name: string
    description?: string | null
    price: number
    duration?: number | null
    category?: string | null
}) {
    const { userId, tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const service = await prisma.service.create({
            data: {
                name: data.name,
                description: data.description || null,
                price: data.price,
                duration: data.duration || null,
                category: data.category || null,
                userId: tenantId,
                createdById: userId,
            },
        })

        revalidatePath("/dashboard/servicos")
        return { success: true, service: { id: service.id, name: service.name } }
    } catch (error) {
        console.error("Erro ao criar serviço:", error)
        return { error: `Erro ao criar serviço: ${(error as Error).message}` }
    }
}

export async function updateService(
    id: string,
    data: {
        name: string
        description?: string | null
        price: number
        duration?: number | null
        category?: string | null
        active?: boolean
    }
) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        await prisma.service.update({
            where: { id, userId: tenantId },
            data: {
                name: data.name,
                description: data.description || null,
                price: data.price,
                duration: data.duration || null,
                category: data.category || null,
                active: data.active ?? true,
            },
        })

        revalidatePath("/dashboard/servicos")
        return { success: true }
    } catch (error) {
        console.error("Erro ao atualizar serviço:", error)
        return { error: `Erro ao atualizar serviço: ${(error as Error).message}` }
    }
}

export async function deleteService(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        await prisma.service.delete({
            where: { id, userId: tenantId },
        })

        revalidatePath("/dashboard/servicos")
        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir serviço:", error)
        return { error: `Erro ao excluir serviço: ${(error as Error).message}` }
    }
}
