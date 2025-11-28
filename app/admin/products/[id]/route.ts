import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  return Response.json({ product });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const body = await req.json();

  const { error } = await supabase
    .from("products")
    .update(body)
    .eq("id", id);

  if (error) {
    console.error(error);
    return Response.json({ success: false });
  }

  return Response.json({ success: true });
}
