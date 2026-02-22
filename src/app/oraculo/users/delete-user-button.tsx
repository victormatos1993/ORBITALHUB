"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, AlertCircle } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteUserAccount } from "@/app/actions/oraculo"
import { toast } from "sonner"

interface DeleteUserButtonProps {
    userId: string
    userName: string
    userEmail: string
}

export function DeleteUserButton({ userId, userName, userEmail }: DeleteUserButtonProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleDelete = async () => {
        setIsLoading(true)
        try {
            const result = await deleteUserAccount(userId)
            if (result.success) {
                toast.success(`Conta de ${userName || userEmail} e todos os dados associados foram excluídos.`)
            } else {
                toast.error(result.error || "Erro ao excluir conta.")
            }
        } catch (error: any) {
            toast.error(error.message || "Ocorreu um erro inesperado.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex items-center gap-2 text-destructive mb-2">
                        <AlertCircle className="h-5 w-5" />
                        <AlertDialogTitle>Excluir Conta Permanentemente?</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription>
                        Esta ação é irreversível. Isso excluirá permanentemente a conta de <strong className="text-foreground">{userName || userEmail}</strong> e
                        <strong className="text-destructive font-bold"> TODOS </strong> os dados técnicos, financeiros, clientes e configurações associados a esta conta no banco de dados.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault()
                            handleDelete()
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isLoading}
                    >
                        {isLoading ? "Excluindo..." : "Sim, Excluir Tudo"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
