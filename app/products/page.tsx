import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default async function ProductsPage() {
  const { data: products, error } = await supabase
    .from("products")
    .select("*");

  console.log("PRODUCTS:", products, error);

  if (error) return <p>Error loading products</p>;

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6">Products</h1>

      <pre>{JSON.stringify(products, null, 2)}</pre>

      {products?.length === 0 && <p>No products available.</p>}
    </div>
  );
}
