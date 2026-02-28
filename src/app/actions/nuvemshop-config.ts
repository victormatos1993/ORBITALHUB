"use server"

import { prisma } from "@/lib/prisma"
import { getTenantInfo } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"

export async function getNuvemshopConfig() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    try {
        const config = await (prisma as any).nuvemshopConfig.findUnique({
            where: { userId: tenantId },
        })
        return config
    } catch {
        return null
    }
}

export async function saveNuvemshopConfig(data: {
    storeId: string
    accessToken: string
    syncEnabled: boolean
}) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    if (!data.storeId || !data.accessToken) {
        return { error: "Store ID e Access Token são obrigatórios" }
    }

    try {
        await (prisma as any).nuvemshopConfig.upsert({
            where: { userId: tenantId },
            create: {
                userId: tenantId,
                storeId: data.storeId,
                accessToken: data.accessToken,
                syncEnabled: data.syncEnabled,
            },
            update: {
                storeId: data.storeId,
                accessToken: data.accessToken,
                syncEnabled: data.syncEnabled,
            },
        })

        revalidatePath("/dashboard/integracoes/nuvemshop")
        return { success: true }
    } catch (error) {
        console.error("Erro ao salvar config Nuvemshop:", error)
        return { error: "Erro ao salvar configuração" }
    }
}

export async function toggleNuvemshopSync(enabled: boolean) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        await (prisma as any).nuvemshopConfig.update({
            where: { userId: tenantId },
            data: { syncEnabled: enabled },
        })
        revalidatePath("/dashboard/integracoes/nuvemshop")
        return { success: true }
    } catch {
        return { error: "Configuração não encontrada" }
    }
}
