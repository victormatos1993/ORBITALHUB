import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    // Buscar todas as vendas com frete que NÃO têm envio
    const salesWithFreight = await prisma.sale.findMany({
        where: {
            OR: [
                { shippingCost: { gt: 0 } },
                { carrierId: { not: null } },
            ],
            shipmentOrder: null,
        },
        select: {
            id: true,
            userId: true,
            carrierId: true,
            shippingCost: true,
            date: true,
            customer: { select: { name: true } },
        },
    })

    console.log(`Encontradas ${salesWithFreight.length} vendas com frete sem envio.`)

    for (const sale of salesWithFreight) {
        await prisma.shipmentOrder.create({
            data: {
                saleId: sale.id,
                userId: sale.userId,
                carrierId: sale.carrierId || null,
                shippingCost: sale.shippingCost || null,
                status: "PENDENTE",
            },
        })
        console.log(`✅ Envio criado: ${sale.customer?.name || "Avulso"} — R$${Number(sale.shippingCost ?? 0).toFixed(2)}`)
    }

    console.log(`\nDone! ${salesWithFreight.length} envios criados.`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
