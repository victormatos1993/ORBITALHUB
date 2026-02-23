/**
 * Backfill: paymentStatus + attendanceStatus para eventos existentes
 *
 * Regras:
 * - notificationStatus = ACTED_PDV  → paymentStatus=PAID,      attendanceStatus=COMPLETED
 * - notificationStatus = CANCELLED  → paymentStatus=CANCELLED,  attendanceStatus=CANCELLED
 * - Tem transação PAID vinculada     → paymentStatus=PAID,      attendanceStatus=COMPLETED
 * - Tem transação PENDING vinculada  → paymentStatus=PENDING,   attendanceStatus=SCHEDULED
 * - Sem transação financeira         → paymentStatus=null,      attendanceStatus=SCHEDULED
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    const events = await prisma.agendaEvent.findMany({
        where: {
            OR: [
                { paymentStatus: null },
                { attendanceStatus: null },
            ]
        },
        include: {
            transactions: { select: { status: true } }
        }
    })

    console.log(`→ Encontrados ${events.length} eventos para backfill`)

    let updated = 0

    for (const event of events) {
        let paymentStatus: string | null = null
        let attendanceStatus = "SCHEDULED"

        // 1. Prioridade máxima: notificationStatus já definido
        if (event.notificationStatus === "ACTED_PDV") {
            paymentStatus = "PAID"
            attendanceStatus = "COMPLETED"
        } else if (event.notificationStatus === "CANCELLED") {
            paymentStatus = "CANCELLED"
            attendanceStatus = "CANCELLED"
        } else {
            // 2. Analisa as transações vinculadas
            const hasPaid = event.transactions.some(t => t.status === "paid")
            const hasPending = event.transactions.some(t => t.status === "pending")

            if (hasPaid) {
                paymentStatus = "PAID"
                attendanceStatus = "COMPLETED"
            } else if (hasPending) {
                paymentStatus = "PENDING"
                attendanceStatus = "SCHEDULED"
            }
            // else: sem transação → paymentStatus = null, attendanceStatus = SCHEDULED
        }

        // Só atualiza se mudou algo
        if (event.paymentStatus !== paymentStatus || event.attendanceStatus !== attendanceStatus) {
            await prisma.agendaEvent.update({
                where: { id: event.id },
                data: { paymentStatus, attendanceStatus }
            })
            updated++
            console.log(`  ✓ ${event.title} → pay=${paymentStatus}, att=${attendanceStatus}`)
        }
    }

    console.log(`\n✅ Backfill concluído: ${updated} eventos atualizados.`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
