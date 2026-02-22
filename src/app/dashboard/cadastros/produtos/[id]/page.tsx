import { getProduct } from "@/app/actions/product"
import { ProductForm } from "@/components/inventory/product-form"
import { notFound } from "next/navigation"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const product = await getProduct(id)

    if (!product) {
        return notFound()
    }

    return (
        <div>
            <ProductForm initialData={product} />
        </div>
    )
}
