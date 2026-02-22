import { TransactionForm } from "@/components/finance/transaction-form"
import { getTransaction } from "@/app/actions/transaction"
import { getCategories } from "@/app/actions/category"
import { getCustomers } from "@/app/actions/customer"
import { getSuppliers } from "@/app/actions/supplier"
import { notFound } from "next/navigation"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditTransactionPage({ params }: PageProps) {
    const { id } = await params
    const transaction = await getTransaction(id)

    if (!transaction) {
        notFound()
    }

    const [categories, { customers }, { suppliers }] = await Promise.all([
        getCategories(),
        getCustomers({ pageSize: 1000 }),
        getSuppliers({ pageSize: 1000 })
    ])

    const serializedTransaction = {
        ...transaction,
        amount: transaction.amount.toNumber(),
    }

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Editar Transação</h2>
                    <p className="text-muted-foreground">
                        Faça alterações na transação existente.
                    </p>
                </div>
            </div>
            <div className="mx-auto w-full max-w-2xl bg-white p-6 shadow-sm rounded-lg border">
                <TransactionForm
                    initialData={serializedTransaction}
                    categories={categories}
                    customers={customers}
                    suppliers={suppliers}
                />
            </div>
        </div>
    )
}
