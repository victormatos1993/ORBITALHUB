"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, ShoppingBag, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { ExportCsvButton } from "@/components/ui/export-csv-button"
import { getProducts } from "@/app/actions/product"
import { columns, type Product, registerEditCallback } from "./columns"
import { ProductModal } from "@/components/inventory/product-modal"

type TabType = "VENDA" | "INTERNO"

export default function ProductsPage() {
    const router = useRouter()
    const [products, setProducts] = useState<Product[]>([])
    const [total, setTotal] = useState(0)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [activeTab, setActiveTab] = useState<TabType>("VENDA")

    const load = useCallback(async () => {
        const res = await getProducts({ pageSize: 200, productType: activeTab })
        setProducts(res.products as Product[])
        setTotal(res.total)
    }, [activeTab])

    useEffect(() => {
        load()
        registerEditCallback((product) => {
            setEditingProduct(product)
            setModalOpen(true)
        })
    }, [load])

    const handleOpenCreate = () => {
        setEditingProduct(null)
        setModalOpen(true)
    }

    const tabs: { value: TabType; label: string; icon: React.ReactNode }[] = [
        { value: "VENDA", label: "Produtos", icon: <ShoppingBag className="h-4 w-4" /> },
        { value: "INTERNO", label: "Materiais", icon: <Wrench className="h-4 w-4" /> },
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">
                    {activeTab === "VENDA" ? "Produtos" : "Materiais Internos"}
                </h1>
                <div className="flex items-center space-x-2">
                    <Button
                        onClick={handleOpenCreate}
                        className="rounded-xl gradient-primary text-white hover:opacity-90 gap-2"
                    >
                        <Plus className="h-4 w-4" /> {activeTab === "VENDA" ? "Novo Produto" : "Novo Material"}
                    </Button>
                    <ExportCsvButton data={products} filename={activeTab === "VENDA" ? "produtos" : "materiais"} />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex rounded-lg border overflow-hidden w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.value
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted text-muted-foreground"
                            }`}
                    >
                        {tab.icon} {tab.label}
                        <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.value
                                ? "bg-primary-foreground/20"
                                : "bg-muted-foreground/10"
                            }`}>
                            {activeTab === tab.value ? total : ""}
                        </span>
                    </button>
                ))}
            </div>

            <DataTable
                columns={columns}
                data={products}
                enableSearch
                searchPlaceholder={activeTab === "VENDA" ? "Filtrar por nome, SKU..." : "Filtrar por nome, material..."}
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
