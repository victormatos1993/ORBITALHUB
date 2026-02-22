import { CategoryForm } from "@/components/finance/category-form"

export default function NewCategoryPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Nova Categoria</h1>
                <p className="text-muted-foreground">
                    Crie uma nova categoria para classificar suas transações.
                </p>
            </div>
            <CategoryForm />
        </div>
    )
}
