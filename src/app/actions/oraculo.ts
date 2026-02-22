"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function deleteUserAccount(userId: string) {
    const session = await auth()

    // Check if the current user is an ORACULO
    if ((session?.user as any)?.role !== "ORACULO") {
        throw new Error("Não autorizado")
    }

    // Prevents deleting yourself or another ORACULO (optional, but safer)
    const userToDelete = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            role: true,
            email: true
        } as any
    })

    if (!userToDelete) {
        throw new Error("Usuário não encontrado")
    }

    if ((userToDelete as any).role === "ORACULO") {
        throw new Error("Não é permitido excluir contas de Oráculo diretamente")
    }

    try {
        // Since we have onDelete: Cascade in schema.prisma, deleting the user 
        // will automatically delete all their associated data (tenant data).
        await prisma.user.delete({
            where: { id: userId }
        })

        revalidatePath("/oraculo/users")
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar conta:", error)
        return { success: false, error: "Falha ao eliminar conta e dados." }
    }
}

export async function wipeAllTechnicalData() {
    const session = await auth()

    // Check if the current user is an ORACULO
    if ((session?.user as any)?.role !== "ORACULO") {
        throw new Error("Não autorizado")
    }

    try {
        // Delete all data from business tables
        // We do this in order to respect foreign keys if not cascaded, 
        // but here we just want a clean slate for the SaaS.

        await prisma.transaction.deleteMany({})
        await prisma.saleItem.deleteMany({})
        await prisma.sale.deleteMany({})
        await prisma.quoteItem.deleteMany({})
        await prisma.quote.deleteMany({})
        await prisma.agendaEvent.deleteMany({})
        await prisma.customer.deleteMany({})
        await prisma.product.deleteMany({})
        await prisma.service.deleteMany({})
        await prisma.category.deleteMany({})
        await prisma.company.deleteMany({})

        revalidatePath("/dashboard")
        return { success: true }
    } catch (error) {
        console.error("Erro ao limpar dados do sistema:", error)
        return { success: false, error: "Falha ao limpar dados globais." }
    }
}
