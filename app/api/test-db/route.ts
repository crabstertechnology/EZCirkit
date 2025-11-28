import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase.from("products").select("*").limit(1);

  return Response.json({
    status: error ? "error" : "success",
    error,
    data
  });
}
