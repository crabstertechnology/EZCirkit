import { supabase } from "@/lib/supabaseClient";
import AddToCartButton from "./AddToCartButton";

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
}

interface ProductPageProps {
    params: Promise<{ id: string }>;
}

export default async function ProductPage(props: ProductPageProps) {
    const { id } = await props.params; // Next.js 16 param fix

    const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single<Product>();

    if (!product) {
        return <div>Product not found</div>;
    }

    return (
        <div className="p-10">
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="mt-4">{product.description}</p>

            <p className="text-orange-500 font-bold text-2xl mt-6">
                ₹{product.price / 100}
            </p>

            {/* CLIENT COMPONENT */}
            <AddToCartButton product={product} />
        </div>
    );
}
