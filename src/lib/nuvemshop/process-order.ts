import { prisma } from "@/lib/prisma"
import { processSale } from "@/app/actions/sales"

// Tipos da API Nuvemshop
interface NuvemshopAddress {
    first_name?: string
    last_name?: string
    address?: string
    number?: string
    floor?: string
    apartment?: string
    city?: string
    province?: string
    zip?: string
    country?: string
    phone?: string
}

interface NuvemshopProduct {
    product_id: number
    name: string
    quantity: number
    price: string
    sku?: string
}

interface NuvemshopOrder {
    id: number
    number: number
    status: string
    payment_status: string
    gateway?: string
    total: string
    subtotal: string
    shipping?: { cost?: string }
    products: NuvemshopProduct[]
    customer?: {
        id: number
        name?: string
        email?: string
        phone?: string
        billing_address?: NuvemshopAddress
        default_address?: NuvemshopAddress
    }
    shipping_address?: NuvemshopAddress
    created_at: string
    store_id?: string
}

/**
 * Mapeia o gateway de pagamento da Nuvemshop para os métodos do Orbital Hub.
 */
function mapPaymentMethod(gateway?: string): string {
    if (!gateway) return "OUTROS"
    const g = gateway.toLowerCase()
    if (g.includes("pix")) return "PIX"
    if (g.includes("boleto")) return "BOLETO"
    if (g.includes("credit") || g.includes("credito")) return "CREDITO"
    if (g.includes("debit") || g.includes("debito")) return "DEBITO"
    if (g.includes("cash") || g.includes("dinheiro")) return "DINHEIRO"
    return "OUTROS"
}

/**
 * Processa um pedido da Nuvemshop e cria os registros no Orbital Hub.
 * - Cria/encontra o cliente
 * - Cria a venda (usando processSale já existente)
 * - Contas a Receber geradas automaticamente pelo processSale
 * - ShipmentOrder gerado automaticamente pelo processSale
 */
export async function processNuvemshopOrder(tenantId: string, order: NuvemshopOrder) {
    try {
        // 1. Deduplicação — verificar se o pedido já foi importado
        const existingSale = await (prisma as any).sale.findFirst({
            where: { userId: tenantId, nuvemshopOrderId: String(order.id) },
        })
        if (existingSale) {
            console.log(`[Nuvemshop] Pedido #${order.id} já importado. Ignorando.`)
            return { success: true, skipped: true }
        }

        // 2. Cliente — buscar por email ou criar
        let customerId: string | null = null
        if (order.customer?.email) {
            const existingCustomer = await prisma.customer.findFirst({
                where: { userId: tenantId, email: order.customer.email },
            })

            if (existingCustomer) {
                customerId = existingCustomer.id
            } else {
                const addr = order.customer.billing_address || order.customer.default_address
                const newCustomer = await prisma.customer.create({
                    data: {
                        userId: tenantId,
                        name: order.customer.name || `Cliente Nuvemshop #${order.customer.id}`,
                        email: order.customer.email || null,
                        phone: order.customer.phone || addr?.phone || null,
                        address: addr?.address || null,
                        number: addr?.number || null,
                        complement: addr?.floor ? `Andar ${addr.floor}` : (addr?.apartment || null),
                        city: addr?.city || null,
                        state: addr?.province || null,
                        zipCode: addr?.zip || null,
                    },
                })
                customerId = newCustomer.id
            }
        }

        // 3. Montar itens da venda
        // Tenta casar produtos pelo SKU, depois pelo nome
        const saleItems = []
        for (const p of order.products) {
            let productMatch = null

            if (p.sku) {
                productMatch = await prisma.product.findFirst({
                    where: { userId: tenantId, sku: p.sku },
                })
            }
            if (!productMatch) {
                productMatch = await prisma.product.findFirst({
                    where: { userId: tenantId, name: { equals: p.name, mode: "insensitive" } },
                })
            }

            saleItems.push({
                itemType: "product" as const,
                productId: productMatch?.id,
                quantity: p.quantity,
                unitPrice: parseFloat(p.price),
                // Se não encontrou o produto, armazena o nome para referência
                _nuvemshopName: !productMatch ? p.name : undefined,
            })
        }

        // 4. Verificar se há itens sem produto cadastrado (não podemos criar sem productId obrigatório)
        // Para esses, usamos preço unitário mas sem vinculação ao estoque
        const validItems = saleItems.filter(i => i.productId || true) // aceita mesmo sem match

        // 5. Frete
        const shippingCost = order.shipping?.cost ? parseFloat(order.shipping.cost) : null

        // 6. Status de pagamento
        const isPaid = ["paid", "authorized"].includes(order.payment_status?.toLowerCase() || "")
        const paymentMethod = mapPaymentMethod(order.gateway)

        // 7. Criar venda usando processSale (que cria automaticamente transações e shipment)
        const saleDate = new Date(order.created_at)

        // Como processSale requer productId válido, vamos criar a venda diretamente para pedidos Nuvemshop
        // que podem ter produtos não cadastrados
        const sale = await (prisma as any).sale.create({
            data: {
                userId: tenantId,
                customerId,
                totalAmount: parseFloat(order.total),
                date: saleDate,
                status: "COMPLETED",
                paymentMethod,
                paymentType: "A_VISTA",
                installments: 1,
                shippingCost,
                shippingStatus: isPaid ? "PAID" : "PENDING",
                freightPaidBy: "CLIENTE",
                nuvemshopOrderId: String(order.id),
            },
        })

        // 8. Criar itens da venda
        for (const item of saleItems) {
            await (prisma as any).saleItem.create({
                data: {
                    saleId: sale.id,
                    itemType: "product",
                    productId: item.productId || null,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.quantity * item.unitPrice,
                },
            })

            // Baixar estoque se produto encontrado
            if (item.productId) {
                const product = await prisma.product.findUnique({ where: { id: item.productId } })
                if (product?.manageStock) {
                    await prisma.product.update({
                        where: { id: item.productId },
                        data: { stockQuantity: { decrement: item.quantity } },
                    })
                }
            }
        }

        // 9. Criar transação financeira (Conta a Receber ou já recebida)
        let salesCategory = await (prisma as any).category.findFirst({
            where: { userId: tenantId, code: "1.1", isSystem: true },
        })
        if (!salesCategory) {
            salesCategory = await (prisma as any).category.findFirst({
                where: { userId: tenantId, name: "Vendas", type: "income" },
            })
        }
        if (!salesCategory) {
            salesCategory = await (prisma as any).category.create({
                data: { userId: tenantId, name: "Vendas", type: "income", color: "#10b981" },
            })
        }

        await prisma.transaction.create({
            data: {
                userId: tenantId,
                description: `Nuvemshop — Pedido #${order.number}`,
                amount: parseFloat(order.total),
                type: "income",
                status: isPaid ? "paid" : "pending",
                paidAt: isPaid ? saleDate : null,
                date: saleDate,
                competenceDate: saleDate,
                customerId,
                saleId: sale.id,
                categoryId: salesCategory.id,
            } as any,
        })

        // 10. Criar envio se tiver frete ou endereço de entrega
        if (shippingCost || order.shipping_address) {
            const existing = await (prisma as any).shipmentOrder.findUnique({ where: { saleId: sale.id } })
            if (!existing) {
                await (prisma as any).shipmentOrder.create({
                    data: {
                        saleId: sale.id,
                        userId: tenantId,
                        shippingCost: shippingCost || null,
                        status: "PENDENTE",
                    },
                })
            }
        }

        // 11. Atualizar lastSyncAt
        await (prisma as any).nuvemshopConfig.updateMany({
            where: { userId: tenantId },
            data: { lastSyncAt: new Date() },
        })

        console.log(`[Nuvemshop] Pedido #${order.id} importado com sucesso → Sale ${sale.id}`)
        return { success: true, saleId: sale.id }

    } catch (error) {
        console.error(`[Nuvemshop] Erro ao processar pedido #${order.id}:`, error)
        return { error: `Erro ao processar pedido: ${(error as Error).message}` }
    }
}
