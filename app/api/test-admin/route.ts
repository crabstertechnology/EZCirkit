import { supabaseServer } from "@/lib/supabaseServer";

export async function POST() {
  const { data, error } = await supabaseServer
    .from("products")
    .insert({
      name: "Test Product",
      price: 99900,
      images: [],
      stock: 10
    })
    .select("*");

  return Response.json({
    status: error ? "error" : "success",
    error,
    data
  });
}
