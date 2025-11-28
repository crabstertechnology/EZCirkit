import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const body = await req.json();

  const { error } = await supabase.from("products").insert({
    name: body.name,
    description: body.description,
    price: body.price,
    stock: body.stock,
    is_active: body.is_active,
    images: [], // will add storage later
  });

  if (error) {
    console.error(error);
    return Response.json({ success: false });
  }

  return Response.json({ success: true });
}
