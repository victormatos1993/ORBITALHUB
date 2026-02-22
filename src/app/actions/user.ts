"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function updateUserProfile(data: {
    name?: string
    phone?: string
    position?: string
}) {
    const session = await auth()
    let userId = session?.user?.id
    if (!userId && session?.user?.email) {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })
        userId = user?.id
    }

    if (!userId) {
        return { success: false, error: "Não autorizado" }
    }

    console.log(`[updateUserProfile] Updating user ${userId}:`, data)
    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                phone: data.phone,
                position: data.position
            } as any
        })
        console.log(`[updateUserProfile] Success for ${userId}`, updatedUser)

        revalidatePath("/dashboard/settings")
        return { success: true }
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error)
        return { success: false, error: "Falha ao atualizar perfil no banco de dados." }
    }
}
