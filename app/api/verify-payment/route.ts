import crypto from "crypto";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const data = await req.json();

  const body = data.razorpay_order_id + "|" + data.razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== data.razorpay_signature) {
    return Response.json({ success: false });
  }

  // Save order in Supabase
  const { order_details } = data;

  await supabase.from("orders").insert({
    user_name: order_details.checkoutInfo.name,
    email: order_details.checkoutInfo.email,
    phone: order_details.checkoutInfo.phone,
    address: order_details.checkoutInfo.address,
    pincode: order_details.checkoutInfo.pincode,
    amount: order_details.amount,
    payment_id: data.razorpay_payment_id,
    status: "paid",
  });

  return Response.json({ success: true });
}
