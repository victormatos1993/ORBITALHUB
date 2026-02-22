"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
    UserPlus,
    CheckCircle2,
    Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { createCustomer } from "@/app/actions/customer"
import { cn } from "@/lib/utils"

// Input masks
function maskCpfCnpj(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 14)
    if (digits.length <= 11) {
        // CPF: 000.000.000-00
        return digits
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    } else {
        // CNPJ: 00.000.000/0000-00
        return digits
            .replace(/(\d{2})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1/$2")
            .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
    }
}

function maskPhone(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11)
    if (digits.length <= 10) {
        // (00) 0000-0000
        return digits
            .replace(/(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{4})(\d{1,4})$/, "$1-$2")
    } else {
        // (00) 00000-0000
        return digits
            .replace(/(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{5})(\d{1,4})$/, "$1-$2")
    }
}

interface QuickCustomerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: (customer: { id: string; name: string; document: string | null; email?: string | null; phone?: string | null }) => void
    initialName?: string
}

export function QuickCustomerDialog({ open, onOpenChange, onSuccess, initialName = "" }: QuickCustomerDialogProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: initialName,
        document: "",
        phone: "",
        email: "",
    })

    // Sincronizar nome inicial se ele mudar (útil quando o usuário digita no combobox e clica para criar)
    useEffect(() => {
        setFormData(prev => ({ ...prev, name: initialName }))
    }, [initialName])

    const handleCreateCustomer = async () => {
        if (!formData.name.trim()) {
            toast.error("Nome do cliente é obrigatório")
            return
        }

        if (formData.email.trim() && !formData.email.includes("@")) {
            toast.error("E-mail inválido. Deve conter @")
            return
        }

        setLoading(true)
        try {
            const result = await createCustomer({
                name: formData.name.trim(),
                document: formData.document.trim() || null,
                phone: formData.phone.trim() || null,
                email: formData.email.trim() || null,
            })

            if (result.error) {
                toast.error(result.error)
            } else if (result.customer) {
                onSuccess({
                    id: result.customer.id,
                    name: result.customer.name,
                    document: result.customer.document || null,
                    email: result.customer.email,
                    phone: result.customer.phone,
                })
                onOpenChange(false)
                setFormData({ name: "", document: "", phone: "", email: "" })
                toast.success(`Cliente "${result.customer.name}" cadastrado com sucesso!`)
            }
        } catch {
            toast.error("Erro ao cadastrar cliente")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                            <UserPlus className="h-5 w-5 text-primary" />
                        </div>
                        Cadastro Rápido de Cliente
                    </DialogTitle>
                    <DialogDescription>
                        Preencha os dados básicos do cliente. Você poderá complementar o cadastro depois.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="quick-customer-name" className="text-sm font-medium">
                            Nome <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="quick-customer-name"
                            placeholder="Nome completo ou razão social"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="rounded-xl"
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="quick-customer-document" className="text-sm font-medium">
                                CPF / CNPJ
                            </Label>
                            <Input
                                id="quick-customer-document"
                                placeholder="000.000.000-00"
                                value={formData.document}
                                onChange={(e) => setFormData(prev => ({ ...prev, document: maskCpfCnpj(e.target.value) }))}
                                className="rounded-xl"
                                maxLength={18}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quick-customer-phone" className="text-sm font-medium">
                                Telefone
                            </Label>
                            <Input
                                id="quick-customer-phone"
                                placeholder="(00) 00000-0000"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: maskPhone(e.target.value) }))}
                                className="rounded-xl"
                                maxLength={15}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quick-customer-email" className="text-sm font-medium">
                            E-mail
                        </Label>
                        <Input
                            id="quick-customer-email"
                            type="email"
                            placeholder="email@exemplo.com"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className={cn(
                                "rounded-xl",
                                formData.email.trim() && !formData.email.includes("@") && "border-destructive focus-visible:ring-destructive"
                            )}
                        />
                        {formData.email.trim() && !formData.email.includes("@") && (
                            <p className="text-xs text-destructive">E-mail deve conter @</p>
                        )}
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleCreateCustomer}
                        disabled={loading || !formData.name.trim()}
                        className="rounded-xl gradient-primary text-white hover:opacity-90"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Cadastrar
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
