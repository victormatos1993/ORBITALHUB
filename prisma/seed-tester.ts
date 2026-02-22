import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Criando Usuário Demo Tester ---')

    const user = await prisma.user.upsert({
        where: { email: 'tester@demo.com' },
        update: {},
        create: {
            email: 'tester@demo.com',
            name: 'Demo Tester',
        },
    })

    console.log('Usuário criado/verificado:', user)

    // Opcional: Criar uma empresa para esse usuário se não houver
    const company = await prisma.company.upsert({
        where: { userId: user.id },
        update: {},
        create: {
            name: 'Empresa Demo Tester',
            tradingName: 'Demo ERP',
            document: '00.000.000/0001-00',
            userId: user.id
        }
    })

    console.log('Empresa vinculada:', company)
    console.log('--- Setup concluído ---')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
