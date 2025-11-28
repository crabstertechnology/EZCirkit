import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default async function AdminProductsPage() {
  const { data: products } = await supabase
    .from("products")
    .select("*");

  return (
    <div className="p-10">
      <h2 className="text-3xl font-bold mb-6">Manage Products</h2>

      {/* ADD PRODUCT BUTTON */}
      <Link
        href="/admin/products/add"
        className="inline-block mb-6 bg-orange-600 text-white px-4 py-2 rounded-lg"
      >
        + Add New Product
      </Link>

      <div className="space-y-4">
        {products?.map((p) => (
          <div key={p.id} className="border p-4 rounded space-y-2">
            <p className="font-bold">{p.name}</p>
            <p>₹{p.price / 100}</p>
            <p>Stock: {p.stock}</p>

            {/* EDIT BUTTON */}
            <Link
              href={`/admin/products/${p.id}`}
              className="text-blue-600 underline"
            >
              Edit
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
