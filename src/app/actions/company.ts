"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { getTenantInfo } from "@/lib/auth-utils"

export async function getCompany() {
    try {
        const { tenantId } = await getTenantInfo()
        if (!tenantId) {
            return { error: "Não autorizado" }
        }

        const company = await prisma.company.findUnique({
            where: { userId: tenantId },
        })

        if (!company) {
            return { data: null }
        }

        return { data: company }
    } catch (error) {
        console.error("Erro ao buscar dados da empresa:", error)
        return { error: "Erro ao buscar dados da empresa" }
    }
}

export async function saveCompany(data: any) {
    try {
        const { tenantId } = await getTenantInfo()
        if (!tenantId) {
            return { error: "Não autorizado" }
        }

        const payload = {
            name: data.name,
            tradingName: data.tradingName || null,
            document: data.document || null,
            email: data.email || null,
            phone: data.phone || null,
            mobile: data.mobile || null,
            address: data.address || null,
            number: data.number || null,
            complement: data.complement || null,
            neighborhood: data.neighborhood || null,
            city: data.city || null,
            state: data.state || null,
            zipCode: data.zipCode || null,
            logoUrl: data.logoUrl || null,
            quoteNotes: data.quoteNotes || null,
        }

        const existingCompany = await prisma.company.findUnique({
            where: { userId: tenantId }
        })

        if (existingCompany) {
            const updated = await prisma.company.update({
                where: { id: existingCompany.id },
                data: payload,
            })
            revalidatePath("/dashboard/settings")
            return { success: true, data: updated }
        } else {
            const created = await prisma.company.create({
                data: {
                    ...payload,
                    userId: tenantId,
                },
            })
            revalidatePath("/dashboard/settings")
            return { success: true, data: created }
        }
    } catch (error) {
        console.error("Erro ao salvar dados da empresa:", error)
        return { error: "Erro interno ao salvar dados" }
    }
}
