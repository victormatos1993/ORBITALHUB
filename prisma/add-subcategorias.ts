import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    const tenants = await prisma.user.findMany({
        where: { OR: [{ company: { isNot: null } }, { parentAdminId: null, role: { not: "USER" } }] },
        select: { id: true, name: true },
    })

    for (const t of tenants) {
        console.log("Tenant:", t.name || t.id)

        // 1.3 - Receita de Frete (repasse)
        const cat1 = await prisma.category.findFirst({ where: { userId: t.id, code: "1", isSystem: true } })
        if (cat1) {
            const e = await prisma.category.findFirst({ where: { userId: t.id, code: "1.3", isSystem: true } })
            if (!e) {
                await prisma.category.create({ data: { code: "1.3", name: "Receita de Frete (repasse cliente)", type: "income", color: "#a7f3d0", level: 1, isSystem: true, userId: t.id, parentId: cat1.id } })
                console.log("  ✅ 1.3 criada")
            } else { console.log("  ⏭️ 1.3 já existe") }
        }

        // 2.4.1, 2.4.2, 2.5
        const cat2 = await prisma.category.findFirst({ where: { userId: t.id, code: "2", isSystem: true } })
        const cat24 = await prisma.category.findFirst({ where: { userId: t.id, code: "2.4", isSystem: true } })

        if (cat24) {
            for (const sub of [
                { code: "2.4.1", name: "Frete Repasse (pago pelo cliente)", color: "#fef9c3" },
                { code: "2.4.2", name: "Frete Empresa (pago pela empresa)", color: "#fefce8" },
            ]) {
                const ex = await prisma.category.findFirst({ where: { userId: t.id, code: sub.code, isSystem: true } })
                if (!ex) {
                    await prisma.category.create({ data: { ...sub, type: "expense", level: 2, isSystem: true, userId: t.id, parentId: cat24.id } })
                    console.log("  ✅", sub.code, "criada")
                } else { console.log("  ⏭️", sub.code, "já existe") }
            }
        }

        if (cat2) {
            const e25 = await prisma.category.findFirst({ where: { userId: t.id, code: "2.5", isSystem: true } })
            if (!e25) {
                await prisma.category.create({ data: { code: "2.5", name: "Material de Embalagem", type: "expense", color: "#fed7aa", level: 1, isSystem: true, userId: t.id, parentId: cat2.id } })
                console.log("  ✅ 2.5 criada")
            } else { console.log("  ⏭️ 2.5 já existe") }
        }
    }
    console.log("\n✅ Subcategorias adicionadas!")
}

main()
    .catch(e => { console.error("❌", e); process.exit(1) })
    .finally(() => prisma.$disconnect())
