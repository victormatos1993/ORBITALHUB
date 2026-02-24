"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createContaFinanceira, updateContaFinanceira, deleteContaFinanceira } from "@/app/actions/conta-financeira"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Landmark, Wallet, Smartphone, Star } from "lucide-react"

interface ContaFinanceira {
    id: string
    name: string
    type: string
    balance: number | string
    active: boolean
    isDefault: boolean
}

const TYPE_ICONS: Record<string, any> = {
    CAIXA: Wallet,
    BANCO: Landmark,
    CARTEIRA_DIGITAL: Smartphone,
}

const TYPE_LABELS: Record<string, string> = {
    CAIXA: "Caixa",
    BANCO: "Banco",
    CARTEIRA_DIGITAL: "Carteira Digital",
}

export function ContasBancariasClient({ contas }: { contas: ContaFinanceira[] }) {
    const router = useRouter()
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [formData, setFormData] = useState({ name: "", type: "CAIXA", isDefault: false })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        if (!formData.name.trim()) { toast.error("Nome é obrigatório"); return }
        setLoading(true)
        try {
            if (editId) {
                const result = await updateContaFinanceira(editId, formData)
                if (result.error) { toast.error(result.error) } else { toast.success("Conta atualizada!") }
            } else {
                const result = await createContaFinanceira(formData)
                if (result.error) { toast.error(result.error) } else { toast.success("Conta criada!") }
            }
            setShowForm(false)
            setEditId(null)
            setFormData({ name: "", type: "CAIXA", isDefault: false })
            router.refresh()
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir esta conta financeira?")) return
        const result = await deleteContaFinanceira(id)
        if (result.error) { toast.error(result.error) } else { toast.success("Conta excluída!"); router.refresh() }
    }

    const handleEdit = (conta: ContaFinanceira) => {
        setEditId(conta.id)
        setFormData({ name: conta.name, type: conta.type, isDefault: conta.isDefault })
        setShowForm(true)
    }

    return (
        <div className="space-y-4">
            {/* Botão Adicionar */}
            <div className="flex justify-end">
                <Button onClick={() => { setShowForm(!showForm); setEditId(null); setFormData({ name: "", type: "CAIXA", isDefault: false }) }} className="gap-2">
                    <Plus className="h-4 w-4" /> Nova Conta
                </Button>
            </div>

            {/* Formulário inline */}
            {showForm && (
                <div className="rounded-xl border bg-card p-4 space-y-3">
                    <h3 className="font-medium">{editId ? "Editar Conta" : "Nova Conta Financeira"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                            placeholder="Nome (ex: Caixa Loja, Banco Itaú)"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="rounded-lg border px-3 py-2 text-sm bg-background"
                        />
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="rounded-lg border px-3 py-2 text-sm bg-background"
                        >
                            <option value="CAIXA">Caixa</option>
                            <option value="BANCO">Banco</option>
                            <option value="CARTEIRA_DIGITAL">Carteira Digital</option>
                        </select>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={formData.isDefault}
                                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                className="rounded"
                            />
                            Conta padrão
                        </label>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleSubmit} disabled={loading} size="sm">
                            {loading ? "Salvando..." : editId ? "Salvar" : "Criar"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditId(null) }}>
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            {/* Lista de Contas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contas.map((conta) => {
                    const Icon = TYPE_ICONS[conta.type] || Wallet
                    return (
                        <div key={conta.id} className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <div className="font-medium flex items-center gap-2">
                                            {conta.name}
                                            {conta.isDefault && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
                                        </div>
                                        <Badge variant="secondary" className="text-xs">{TYPE_LABELS[conta.type] || conta.type}</Badge>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(conta)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    {!conta.isDefault && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(conta.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="mt-2">
                                <p className="text-xs text-muted-foreground">Saldo</p>
                                <p className="text-xl font-bold">
                                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(conta.balance))}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {contas.length === 0 && !showForm && (
                <div className="text-center py-12 text-muted-foreground">
                    <Landmark className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Nenhuma conta cadastrada</p>
                    <p className="text-sm">Clique em &quot;Nova Conta&quot; para começar.</p>
                </div>
            )}
        </div>
    )
}
