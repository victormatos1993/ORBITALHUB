import { getContasAPagar } from "@/app/actions/transaction"
import { getCategories } from "@/app/actions/category"
import { getSuppliers } from "@/app/actions/supplier"
import { getContasFinanceiras } from "@/app/actions/conta-financeira"
import { ContasPagarClient } from "./contas-pagar-client"

export default async function ContasPagarPage() {
    const [contas, categories, { suppliers }, contasFinanceiras] = await Promise.all([
        getContasAPagar(),
        getCategories(),
        getSuppliers({ pageSize: 500 }),
        getContasFinanceiras(),
    ])

    const serializedContas = contasFinanceiras.map((c: any) => ({
        id: c.id,
        name: c.name,
        tipo: c.type,
        isDefault: c.isDefault,
        purpose: c.purpose || "RECEBIMENTO",
        subType: c.subType || null,
    }))

    const serializedCategories = categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        code: c.code ?? null,
        level: c.level ?? null,
    }))

    const serializedSuppliers = suppliers.map((s: any) => ({
        id: s.id,
        name: s.name,
    }))

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Contas a Pagar</h1>
                <p className="text-muted-foreground">Gerencie e cadastre suas despesas</p>
            </div>
            <ContasPagarClient
                contas={contas}
                categories={serializedCategories}
                suppliers={serializedSuppliers}
                contasFinanceiras={serializedContas}
            />
        </div>
    )
}
