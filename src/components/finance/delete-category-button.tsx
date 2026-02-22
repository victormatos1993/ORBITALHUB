"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteCategory } from "@/app/actions/category"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function DeleteCategoryButton({ id }: { id: string }) {
    const router = useRouter()

    async function handleDelete() {
        if (!confirm("Tem certeza que deseja excluir esta categoria?")) return

        const result = await deleteCategory(id)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Categoria excluída com sucesso")
            router.refresh()
        }
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
        >
            <Trash2 className="h-4 w-4" />
        </Button>
    )
}
