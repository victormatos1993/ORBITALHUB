"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { ExportCsvButton } from "@/components/ui/export-csv-button"
import { getProducts } from "@/app/actions/product"
import { columns, type Product, registerEditCallback } from "./columns"
import { ProductModal } from "@/components/inventory/product-modal"

export default function ProductsPage() {
    const router = useRouter()
    const [products, setProducts] = useState<Product[]>([])
    const [total, setTotal] = useState(0)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)

    const load = useCallback(async () => {
        const res = await getProducts({ pageSize: 200 })
        setProducts(res.products as Product[])
        setTotal(res.total)
    }, [])

    useEffect(() => {
        load()
        // Registra o callback para que as ActionsCell da tabela abram o modal
        registerEditCallback((product) => {
            setEditingProduct(product)
            setModalOpen(true)
        })
    }, [load])

    const handleOpenCreate = () => {
        setEditingProduct(null)
        setModalOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
                <div className="flex items-center space-x-2">
                    <Button
                        onClick={handleOpenCreate}
                        className="rounded-xl gradient-primary text-white hover:opacity-90 gap-2"
                    >
                        <Plus className="h-4 w-4" /> Novo Produto
                    </Button>
                    <ExportCsvButton data={products} filename="produtos" />
                </div>
            </div>

            <DataTable
                columns={columns}
                data={products}
                enableSearch
                searchPlaceholder="Filtrar por nome, SKU..."
            />

            <ProductModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                editingProduct={editingProduct}
                onSaved={() => {
                    load()
                    router.refresh()
                }}
            />
        </div>
    )
}
