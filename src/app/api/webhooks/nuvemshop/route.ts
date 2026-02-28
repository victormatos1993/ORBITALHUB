import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { processNuvemshopOrder } from "@/lib/nuvemshop/process-order"

/**
 * Webhook endpoint para receber eventos da Nuvemshop.
 * URL: POST /api/webhooks/nuvemshop
 *
 * Configure o webhook no Portal de Parceiros da Nuvemshop apontando para:
 * https://SEU_LINK.vercel.app/api/webhooks/nuvemshop
 *
 * Eventos suportados:
 * - order/created  → importa o pedido
 * - order/paid     → marca transação como paga
 * - order/fulfilled → atualiza status de envio
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { event, store_id, ...payload } = body

        console.log(`[Nuvemshop Webhook] Evento: ${event} | Store: ${store_id}`)

        if (!store_id || !event) {
            return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
        }

        // Encontrar o tenant pela storeId
        const config = await (prisma as any).nuvemshopConfig.findFirst({
            where: { storeId: String(store_id), syncEnabled: true },
        })

        if (!config) {
            // Loja não configurada ou sync desativado — retorna 200 para não gerar retry
            console.log(`[Nuvemshop Webhook] Store ${store_id} não configurada ou sync desativado.`)
            return NextResponse.json({ received: true })
        }

        const tenantId: string = config.userId

        // Roteamento de eventos
        switch (event) {
            case "order/created": {
                const result = await processNuvemshopOrder(tenantId, payload)
                return NextResponse.json(result)
            }

            case "order/paid": {
                // Marcar a transação vinculada como paga
                if (payload.id) {
                    await prisma.transaction.updateMany({
                        where: {
                            userId: tenantId,
                            description: { contains: `#${payload.number}` },
                            status: "pending",
                        },
                        data: { status: "paid", paidAt: new Date() },
                    })
                }
                return NextResponse.json({ received: true })
            }

            case "order/fulfilled": {
                // Atualizar status de envio para EM_TRANSITO
                if (payload.id) {
                    const sale = await (prisma as any).sale.findFirst({
                        where: { userId: tenantId, nuvemshopOrderId: String(payload.id) },
                    })
                    if (sale) {
                        await (prisma as any).shipmentOrder.updateMany({
                            where: { saleId: sale.id },
                            data: {
                                status: "EM_TRANSITO",
                                trackingCode: payload.shipping_tracking_number || null,
                            },
                        })
                    }
                }
                return NextResponse.json({ received: true })
            }

            default:
                // Eventos não tratados — retorna 200 para não gerar retry
                return NextResponse.json({ received: true, event })
        }
    } catch (error) {
        console.error("[Nuvemshop Webhook] Erro:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}

// Health check
export async function GET() {
    return NextResponse.json({ status: "ok", endpoint: "nuvemshop-webhook" })
}
