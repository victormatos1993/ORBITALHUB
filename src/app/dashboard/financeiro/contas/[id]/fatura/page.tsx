import { prisma } from "@/lib/prisma"
import { getTenantInfo } from "@/lib/auth-utils"
import { notFound } from "next/navigation"
import { FaturaClient } from "./fatura-client"

interface FaturaPageProps {
    params: Promise<{ id: string }>
}

export default async function FaturaPage({ params }: FaturaPageProps) {
    const { id } = await params
    const { tenantId } = await getTenantInfo()
    if (!tenantId) notFound()

    const conta = await prisma.contaFinanceira.findFirst({
        where: { id, userId: tenantId } as any,
    })

    if (!conta) notFound()
    const c = conta as any
    if (c.subType !== "CARTAO_CREDITO") notFound()

    // Buscar todas as transações do cartão para filtrar no client
    const transactions = await prisma.transaction.findMany({
        where: { contaFinanceiraId: id },
        orderBy: { date: "desc" },
        include: {
            category: { select: { name: true, code: true } },
            supplier: { select: { name: true } },
        },
    })

    const serializedConta = {
        id: c.id,
        name: c.name,
        cardBrand: c.cardBrand,
        closingDay: c.closingDay || 25,
        dueDay: c.dueDay || 10,
        creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
        balance: Number(c.balance || 0),
    }

    const serializedItems = transactions.map((t: any) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type,
        status: t.status,
        date: t.date.toISOString(),
        categoryName: t.category?.name || null,
        supplierName: t.supplier?.name || null,
    }))

    return (
        <div className="space-y-6">
            <FaturaClient conta={serializedConta} initialItems={serializedItems} />
        </div>
    )
}
