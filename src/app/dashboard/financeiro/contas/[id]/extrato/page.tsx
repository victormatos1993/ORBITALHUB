import { prisma } from "@/lib/prisma"
import { getTenantInfo } from "@/lib/auth-utils"
import { notFound } from "next/navigation"
import { ExtratoClient } from "./extrato-client"

interface ExtratoPageProps {
    params: Promise<{ id: string }>
}

export default async function ExtratoPage({ params }: ExtratoPageProps) {
    const { id } = await params
    const { tenantId } = await getTenantInfo()
    if (!tenantId) notFound()

    const conta = await prisma.contaFinanceira.findFirst({
        where: { id, userId: tenantId },
    })

    if (!conta) notFound()

    // Buscar todas as transações da conta
    const transactions = await prisma.transaction.findMany({
        where: { contaFinanceiraId: id },
        orderBy: { date: "desc" },
        include: {
            category: { select: { name: true, code: true } },
            customer: { select: { name: true } },
            supplier: { select: { name: true } },
        },
    })

    // Buscar outras contas para transferência
    const allContas = await prisma.contaFinanceira.findMany({
        where: { userId: tenantId, active: true, id: { not: id } },
        orderBy: { name: "asc" },
    })

    const serializedConta = {
        id: conta.id,
        name: conta.name,
        type: conta.type,
        balance: Number(conta.balance || 0),
    }

    const serializedItems = transactions.map((t: any) => {
        // Derivar origem
        let origin = "Manual"
        if (t.saleId) {
            origin = "PDV"
        } else if (t.description?.startsWith("Depósito")) {
            origin = "Depósito"
        } else if (t.description?.startsWith("Retirada")) {
            origin = "Retirada"
        } else if (t.description?.startsWith("Transferência")) {
            origin = "Transferência"
        } else if (t.description?.startsWith("Pagamento parcial:")) {
            origin = "Pagamento"
        }

        return {
            id: t.id,
            description: t.description,
            amount: Number(t.amount),
            type: t.type,
            status: t.status,
            date: t.date.toISOString(),
            categoryName: t.category?.name || null,
            customerName: t.customer?.name || null,
            supplierName: t.supplier?.name || null,
            origin,
        }
    })

    const outrasContas = allContas.map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        subType: c.subType || null,
    }))

    return (
        <div className="space-y-6">
            <ExtratoClient
                conta={serializedConta}
                initialItems={serializedItems}
                outrasContas={outrasContas}
            />
        </div>
    )
}
