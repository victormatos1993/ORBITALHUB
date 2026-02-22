import { notFound } from "next/navigation"
import { getCategory } from "@/app/actions/category"
import { CategoryForm } from "@/components/finance/category-form"

interface EditCategoryPageProps {
    params: {
        id: string
    }
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
    const category = await getCategory(params.id)

    if (!category) {
        notFound()
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Editar Categoria</h1>
                <p className="text-muted-foreground">
                    Altere os dados da categoria selecionada.
                </p>
            </div>
            <CategoryForm initialData={category} />
        </div>
    )
}
