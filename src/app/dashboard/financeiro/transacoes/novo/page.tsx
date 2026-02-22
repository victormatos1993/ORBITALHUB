import { TransactionForm } from "@/components/finance/transaction-form"
import { getCategories } from "@/app/actions/category"
import { getCustomers } from "@/app/actions/customer"
import { getSuppliers } from "@/app/actions/supplier"

export default async function NewTransactionPage() {
    const [categories, { customers }, { suppliers }] = await Promise.all([
        getCategories(),
        getCustomers({ pageSize: 1000 }), // Buscando todos (ou muitos) para o dropdown
        getSuppliers({ pageSize: 1000 })
    ])

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Nova Transação</h2>
                    <p className="text-muted-foreground">
                        Cadastre uma nova receita ou despesa.
                    </p>
                </div>
            </div>
            <div className="mx-auto w-full max-w-2xl bg-white p-6 shadow-sm rounded-lg border">
                <TransactionForm
                    categories={categories}
                    customers={customers}
                    suppliers={suppliers}
                />
            </div>
        </div>
    )
}
