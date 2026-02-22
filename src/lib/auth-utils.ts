import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * Retorna as informações de tenant e usuário atual de forma centralizada.
 * O tenantId é o ID do ADMINISTRADOR (dono dos dados).
 * O userId é o ID do usuário logado (pode ser um colaborador).
 */
export async function getTenantInfo() {
    const session = await auth()

    let userId = session?.user?.id
    let role = (session?.user as any)?.role
    let parentAdminId = (session?.user as any)?.parentAdminId

    // Sem fallback para ambiente de teste/desenvolvimento
    if (!userId) {
        // Tenta buscar pelo email se o ID estiver faltando na sessão (sessão antiga)
        if (session?.user?.email) {
            const user = await prisma.user.findUnique({
                where: { email: session.user.email }
            })
            if (user) {
                userId = user.id
                role = (user as any).role
                parentAdminId = (user as any).parentAdminId
            }
        }

        if (!userId) {
            return {
                userId: null,
                tenantId: null,
                role: null
            }
        }
    }

    const tenantId = parentAdminId || userId

    return {
        userId,
        tenantId,
        role
    }
}
