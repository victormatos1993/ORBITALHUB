"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getTenantInfo } from "@/lib/auth-utils"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"

export async function getTeamMembers() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    try {
        const members = await prisma.user.findMany({
            where: { parentAdminId: tenantId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
            orderBy: { name: "asc" },
        })
        return members
    } catch (error) {
        console.error("Erro ao buscar equipe:", error)
        return []
    }
}

export async function createTeamMember(data: {
    name: string
    email: string
    password?: string
    role: Role
}) {
    const { tenantId, role: currentUserRole } = await getTenantInfo()

    // Only administrators can create team members
    if (!tenantId || currentUserRole !== "ADMINISTRADOR") {
        return { error: "Apenas administradores podem gerenciar a equipe." }
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        })

        if (existingUser) {
            return { error: "Este email já está em uso." }
        }

        const hashedPassword = await bcrypt.hash(data.password || "mudar123", 10)

        const member = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: data.role,
                parentAdminId: tenantId,
            }
        })

        revalidatePath("/dashboard/settings")
        return { success: true, member: { id: member.id, name: member.name } }
    } catch (error) {
        console.error("Erro ao criar membro da equipe:", error)
        return { error: `Erro ao criar membro: ${(error as Error).message}` }
    }
}

export async function deleteTeamMember(id: string) {
    const { tenantId, role: currentUserRole } = await getTenantInfo()

    if (!tenantId || currentUserRole !== "ADMINISTRADOR") {
        return { error: "Não autorizado." }
    }

    try {
        await prisma.user.delete({
            where: { id, parentAdminId: tenantId },
        })

        revalidatePath("/dashboard/settings")
        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir membro da equipe:", error)
        return { error: "Erro ao excluir membro da equipe" }
    }
}

export async function updateTeamMemberRole(id: string, role: Role) {
    const { tenantId, role: currentUserRole } = await getTenantInfo()

    if (!tenantId || currentUserRole !== "ADMINISTRADOR") {
        return { error: "Não autorizado." }
    }

    try {
        await prisma.user.update({
            where: { id, parentAdminId: tenantId },
            data: { role },
        })

        revalidatePath("/dashboard/settings")
        return { success: true }
    } catch (error) {
        console.error("Erro ao atualizar papel do membro:", error)
        return { error: "Erro ao atualizar papel" }
    }
}
