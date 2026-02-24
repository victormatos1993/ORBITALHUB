/**
 * Script de Migração Retroativa — Reestruturação Financeira
 * 
 * O que faz:
 * 1. Backfill competenceDate: copia `date` para `competenceDate` onde for null
 * 2. Backfill paidAt: para transactions paid sem paidAt, copia `date`
 * 3. Split de parcelas: vendas parceladas com apenas 1 transaction → gera N transactions
 * 4. Vincula transactions à conta financeira padrão onde não vinculada
 * 
 * Executar: npx tsx scripts/migration-parcelas.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("🔄 Iniciando migração retroativa...\n")

    // ─── 1. Backfill competenceDate ──────────────────────────────────

    const txSemCompetencia = await prisma.transaction.updateMany({
        where: { competenceDate: null },
        data: { competenceDate: new Date("2000-01-01") }, // placeholder pra contornar
    })

    // Na verdade precisamos copiar `date` para `competenceDate`
    const txsToFix = await prisma.transaction.findMany({
        where: { competenceDate: new Date("2000-01-01") },
    })

    for (const tx of txsToFix) {
        await prisma.transaction.update({
            where: { id: tx.id },
            data: { competenceDate: tx.date },
        })
    }

    console.log(`✅ competenceDate preenchido em ${txsToFix.length} transactions`)

    // ─── 2. Backfill paidAt ─────────────────────────────────────────

    const txsPaidSemPaidAt = await prisma.transaction.findMany({
        where: { status: "paid", paidAt: null },
    })

    for (const tx of txsPaidSemPaidAt) {
        await prisma.transaction.update({
            where: { id: tx.id },
            data: { paidAt: tx.date },
        })
    }

    console.log(`✅ paidAt preenchido em ${txsPaidSemPaidAt.length} transactions pagas`)

    // ─── 3. Vincular transactions à conta financeira padrão ─────────

    // Buscar todas as contas financeiras padrão por tenant
    const contasPadrao = await prisma.contaFinanceira.findMany({
        where: { isDefault: true },
    })

    let vinculadas = 0
    for (const conta of contasPadrao) {
        const result = await prisma.transaction.updateMany({
            where: { userId: conta.userId, contaFinanceiraId: null },
            data: { contaFinanceiraId: conta.id },
        })
        vinculadas += result.count
    }

    console.log(`✅ ${vinculadas} transactions vinculadas à conta financeira padrão`)

    // ─── 4. Split de vendas parceladas já existentes ────────────────

    const vendasParceladas = await prisma.sale.findMany({
        where: {
            installments: { gt: 1 },
        },
        include: {
            transactions: true,
        },
    })

    let splitCount = 0

    for (const venda of vendasParceladas) {
        // Só faz split se a venda tem exatamente 1 transaction (não foi processada pelo novo motor)
        const txsReceita = venda.transactions.filter(t => t.type === "income")
        if (txsReceita.length !== 1) {
            console.log(`  ⏩ Venda ${venda.id.slice(-6)} já tem ${txsReceita.length} transactions de receita — pulando`)
            continue
        }

        const txOriginal = txsReceita[0]
        const numParcelas = venda.installments!
        const valorParcela = Number(txOriginal.amount) / numParcelas

        console.log(`  🔀 Splitting venda ${venda.id.slice(-6)}: ${numParcelas} parcelas de R$ ${valorParcela.toFixed(2)}`)

        // Buscar conta padrão do tenant
        const contaPadrao = contasPadrao.find(c => c.userId === venda.userId)

        await prisma.$transaction(async (tx) => {
            // Deletar a transaction original
            await tx.transaction.delete({ where: { id: txOriginal.id } })

            // Criar N novas transactions
            for (let i = 1; i <= numParcelas; i++) {
                const vencimento = new Date(venda.date)
                vencimento.setDate(vencimento.getDate() + 30 * i)

                await tx.transaction.create({
                    data: {
                        userId: venda.userId,
                        createdById: txOriginal.createdById,
                        description: `Venda #${venda.id.slice(-6).toUpperCase()} — Parcela ${i}/${numParcelas}`,
                        amount: Number(valorParcela.toFixed(2)),
                        type: "income",
                        status: "pending",
                        date: vencimento,
                        competenceDate: venda.date,
                        customerId: venda.customerId,
                        saleId: venda.id,
                        categoryId: txOriginal.categoryId,
                        contaFinanceiraId: contaPadrao?.id || null,
                        installmentNumber: i,
                        installmentTotal: numParcelas,
                        taxaAplicada: 0,
                    },
                })
            }
        })

        splitCount++
    }

    console.log(`✅ ${splitCount} vendas parceladas migradas (split em N transactions)`)

    // ─── Resumo ──────────────────────────────────────────────────────

    const totalTx = await prisma.transaction.count()
    const totalComCompetencia = await prisma.transaction.count({ where: { competenceDate: { not: null } } })
    const totalComPaidAt = await prisma.transaction.count({ where: { paidAt: { not: null } } })
    const totalComConta = await prisma.transaction.count({ where: { contaFinanceiraId: { not: null } } })

    console.log("\n📊 Resumo Final:")
    console.log(`  Total de transactions: ${totalTx}`)
    console.log(`  Com competenceDate: ${totalComCompetencia}`)
    console.log(`  Com paidAt: ${totalComPaidAt}`)
    console.log(`  Com contaFinanceira: ${totalComConta}`)

    await prisma.$disconnect()
    console.log("\n✅ Migração concluída!")
}

main().catch((e) => {
    console.error("❌ Erro na migração:", e)
    prisma.$disconnect()
    process.exit(1)
})
