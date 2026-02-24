"use server"

import { prisma } from "@/lib/prisma"
import { getTenantInfo } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { METODOS_PAGAMENTO, TAXAS_PADRAO } from "@/lib/payment-constants"

// ── CRUD Maquininhas de Cartão ───────────────────────────────────────

export async function createMaquinaCartao(data: {
    name: string
    diasRecebimento?: number
    modoRecebimento?: string
    taxas?: { metodoPagamento: string; taxa: number }[]
}) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const maquina = await prisma.maquinaCartao.create({
            data: {
                name: data.name,
                diasRecebimento: data.diasRecebimento || 30,
                modoRecebimento: data.modoRecebimento || "PARCELADO",
                userId: tenantId,
                taxas: {
                    create: data.taxas
                        ? data.taxas.map((t) => ({
                            metodoPagamento: t.metodoPagamento,
                            taxa: t.taxa,
                        }))
                        : METODOS_PAGAMENTO.map((m) => ({
                            metodoPagamento: m,
                            taxa: TAXAS_PADRAO[m] || 0,
                        })),
                },
            },
            include: { taxas: true },
        })

        revalidatePath("/dashboard/financeiro/maquininhas")
        return { success: true, maquina }
    } catch (error) {
        console.error("Erro ao criar maquininha:", error)
        return { error: "Erro ao criar maquininha" }
    }
}

export async function getMaquinasCartao() {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return []

    try {
        const maquinas = await prisma.maquinaCartao.findMany({
            where: { userId: tenantId },
            include: { taxas: { orderBy: { metodoPagamento: "asc" } } },
            orderBy: { name: "asc" },
        })
        return maquinas.map((m: any) => ({
            ...m,
            taxas: m.taxas.map((t: any) => ({
                ...t,
                taxa: Number(t.taxa || 0),
            })),
        }))
    } catch (error) {
        console.error("Erro ao buscar maquininhas:", error)
        return []
    }
}

export async function getMaquinaCartao(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return null

    try {
        return await prisma.maquinaCartao.findFirst({
            where: { id, userId: tenantId },
            include: { taxas: { orderBy: { metodoPagamento: "asc" } } },
        })
    } catch (error) {
        console.error("Erro ao buscar maquininha:", error)
        return null
    }
}

export async function updateMaquinaCartao(
    id: string,
    data: {
        name?: string
        diasRecebimento?: number
        modoRecebimento?: string
        active?: boolean
        taxas?: { metodoPagamento: string; taxa: number }[]
    }
) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const existing = await prisma.maquinaCartao.findFirst({
            where: { id, userId: tenantId },
        })
        if (!existing) return { error: "Maquininha não encontrada" }

        await prisma.$transaction(async (tx) => {
            await tx.maquinaCartao.update({
                where: { id },
                data: {
                    name: data.name,
                    diasRecebimento: data.diasRecebimento,
                    modoRecebimento: data.modoRecebimento,
                    active: data.active,
                },
            })

            // Atualizar taxas via upsert
            if (data.taxas) {
                for (const t of data.taxas) {
                    await tx.taxaMaquina.upsert({
                        where: {
                            maquinaId_metodoPagamento: {
                                maquinaId: id,
                                metodoPagamento: t.metodoPagamento,
                            },
                        },
                        update: { taxa: t.taxa },
                        create: {
                            maquinaId: id,
                            metodoPagamento: t.metodoPagamento,
                            taxa: t.taxa,
                        },
                    })
                }
            }
        })

        revalidatePath("/dashboard/financeiro/maquininhas")
        return { success: true }
    } catch (error) {
        console.error("Erro ao atualizar maquininha:", error)
        return { error: "Erro ao atualizar maquininha" }
    }
}

export async function deleteMaquinaCartao(id: string) {
    const { tenantId } = await getTenantInfo()
    if (!tenantId) return { error: "Não autorizado" }

    try {
        const existing = await prisma.maquinaCartao.findFirst({
            where: { id, userId: tenantId },
            include: { _count: { select: { transactions: true } } },
        })
        if (!existing) return { error: "Maquininha não encontrada" }
        if (existing._count.transactions > 0) {
            return { error: `Esta maquininha possui ${existing._count.transactions} transação(ões) vinculada(s). Não é possível excluir.` }
        }

        // Cascade deleta as taxas automaticamente
        await prisma.maquinaCartao.delete({ where: { id } })

        revalidatePath("/dashboard/financeiro/maquininhas")
        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir maquininha:", error)
        return { error: "Erro ao excluir maquininha" }
    }
}

/**
 * Busca a taxa de uma maquininha para um método de pagamento específico.
 * Usado pelo motor de vendas para calcular o valor líquido.
 */
export async function getTaxaByMetodo(maquinaId: string, metodo: string): Promise<number> {
    try {
        const taxa = await prisma.taxaMaquina.findUnique({
            where: {
                maquinaId_metodoPagamento: {
                    maquinaId,
                    metodoPagamento: metodo,
                },
            },
        })
        return taxa ? Number(taxa.taxa) : 0
    } catch (error) {
        console.error("Erro ao buscar taxa:", error)
        return 0
    }
}
