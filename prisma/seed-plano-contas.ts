/**
 * Seed do Plano de Contas padrão
 * Cria as categorias do sistema para cada tenant (usuário admin).
 * Executar: npx tsx prisma/seed-plano-contas.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const PLANO_DE_CONTAS = [
    {
        code: "1",
        name: "Receitas",
        type: "income",
        color: "#10b981",
        level: 0,
        children: [
            { code: "1.1", name: "Receitas de Vendas (Produtos)", type: "income", color: "#34d399", level: 1 },
            { code: "1.2", name: "Receitas de Serviços", type: "income", color: "#6ee7b7", level: 1 },
            { code: "1.3", name: "Receita de Frete (repasse cliente)", type: "income", color: "#a7f3d0", level: 1 },
        ],
    },
    {
        code: "2",
        name: "Custos Variáveis",
        type: "expense",
        color: "#f59e0b",
        level: 0,
        children: [
            { code: "2.1", name: "CMV (Custo da Mercadoria)", type: "expense", color: "#fbbf24", level: 1 },
            { code: "2.2", name: "Impostos sobre Vendas", type: "expense", color: "#fcd34d", level: 1 },
            { code: "2.3", name: "Taxas de Cartão / Meios de Pagamento", type: "expense", color: "#fde68a", level: 1 },
            { code: "2.4", name: "Fretes e Logística", type: "expense", color: "#fef3c7", level: 1 },
            { code: "2.4.1", name: "Frete Repasse (pago pelo cliente)", type: "expense", color: "#fef9c3", level: 2 },
            { code: "2.4.2", name: "Frete Empresa (pago pela empresa)", type: "expense", color: "#fefce8", level: 2 },
            { code: "2.5", name: "Material de Embalagem", type: "expense", color: "#fed7aa", level: 1 },
        ],
    },
    {
        code: "3",
        name: "Despesas Fixas",
        type: "expense",
        color: "#ef4444",
        level: 0,
        children: [
            { code: "3.1", name: "Pessoal (Salários, Pró-labore)", type: "expense", color: "#f87171", level: 1 },
            { code: "3.2", name: "Ocupação (Aluguel, Luz, Internet)", type: "expense", color: "#fca5a5", level: 1 },
            { code: "3.3", name: "Marketing e Software (SaaS, Meta Ads)", type: "expense", color: "#fecaca", level: 1 },
        ],
    },
]

async function seedPlanoDeContas(userId: string) {
    console.log(`\n🌱 Criando Plano de Contas para tenant: ${userId}`)

    for (const grupo of PLANO_DE_CONTAS) {
        // Verifica se já existe
        const existing = await prisma.category.findFirst({
            where: { userId, code: grupo.code, isSystem: true },
        })

        if (existing) {
            console.log(`  ⏭️  Grupo ${grupo.code} "${grupo.name}" já existe, pulando...`)
            continue
        }

        // Cria o grupo pai
        const parent = await prisma.category.create({
            data: {
                code: grupo.code,
                name: grupo.name,
                type: grupo.type,
                color: grupo.color,
                level: grupo.level,
                isSystem: true,
                userId,
            },
        })
        console.log(`  ✅ Grupo ${grupo.code} "${grupo.name}" criado`)

        // Cria os filhos
        const createdChildren: Record<string, string> = {} // code -> id
        for (const child of grupo.children) {
            // Determinar parentId: nível 2 busca pai no nível 1 (ex: 2.4.1 → 2.4)
            let childParentId = parent.id
            if (child.level === 2) {
                const parentCode = child.code.split(".").slice(0, 2).join(".")
                if (createdChildren[parentCode]) {
                    childParentId = createdChildren[parentCode]
                } else {
                    // Buscar no banco caso já exista
                    const existingParent = await prisma.category.findFirst({
                        where: { userId, code: parentCode, isSystem: true },
                    })
                    if (existingParent) childParentId = existingParent.id
                }
            }

            const created = await prisma.category.create({
                data: {
                    code: child.code,
                    name: child.name,
                    type: child.type,
                    color: child.color,
                    level: child.level,
                    isSystem: true,
                    userId,
                    parentId: childParentId,
                },
            })
            createdChildren[child.code] = created.id
            console.log(`    ✅ Subcategoria ${child.code} "${child.name}" criada`)
        }
    }

    // Mapear categorias existentes "Vendas" e "Frete"
    const catVendas = await prisma.category.findFirst({
        where: { userId, name: "Vendas", isSystem: false },
    })
    if (catVendas) {
        const cat11 = await prisma.category.findFirst({
            where: { userId, code: "1.1", isSystem: true },
        })
        if (cat11) {
            // Redirecionar transactions da categoria antiga para a nova
            await prisma.transaction.updateMany({
                where: { categoryId: catVendas.id },
                data: { categoryId: cat11.id },
            })
            console.log(`  🔄 Transactions de "Vendas" migradas para ${cat11.code} "${cat11.name}"`)
        }
    }

    const catFrete = await prisma.category.findFirst({
        where: { userId, name: "Frete", isSystem: false },
    })
    if (catFrete) {
        const cat24 = await prisma.category.findFirst({
            where: { userId, code: "2.4", isSystem: true },
        })
        if (cat24) {
            await prisma.transaction.updateMany({
                where: { categoryId: catFrete.id },
                data: { categoryId: cat24.id },
            })
            console.log(`  🔄 Transactions de "Frete" migradas para ${cat24.code} "${cat24.name}"`)
        }
    }

    // Criar conta padrão "Caixa Geral" se não existir
    const existingConta = await prisma.contaFinanceira.findFirst({
        where: { userId, isDefault: true },
    })
    if (!existingConta) {
        const conta = await prisma.contaFinanceira.create({
            data: {
                name: "Caixa Geral",
                type: "CAIXA",
                isDefault: true,
                userId,
            },
        })
        console.log(`  🏦 Conta padrão "Caixa Geral" criada`)

        // Vincular todas as transactions sem conta à conta padrão
        const updated = await prisma.transaction.updateMany({
            where: { userId, contaFinanceiraId: null },
            data: { contaFinanceiraId: conta.id },
        })
        console.log(`  🔗 ${updated.count} transactions vinculadas à conta padrão`)
    }
}

async function main() {
    // Buscar todos os tenants (usuários que possuem empresa ou são admin)
    const tenants = await prisma.user.findMany({
        where: {
            OR: [
                { company: { isNot: null } },
                { parentAdminId: null, role: { not: "USER" } },
            ],
        },
        select: { id: true, name: true, email: true },
    })

    console.log(`\n📋 Encontrados ${tenants.length} tenant(s) para seed`)

    for (const tenant of tenants) {
        console.log(`\n👤 Tenant: ${tenant.name || tenant.email || tenant.id}`)
        await seedPlanoDeContas(tenant.id)
    }

    console.log("\n✅ Seed finalizado com sucesso!\n")
}

main()
    .catch((e) => {
        console.error("❌ Erro no seed:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
