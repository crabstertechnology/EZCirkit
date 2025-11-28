import { supabase } from "@/lib/supabaseClient";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  const { data: orderItems } = await supabase
    .from("order_items")
    .select("*, products(name, price)")
    .eq("order_id", id);

  async function updateStatus(status: string) {
    "use server";

    await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Order Details</h1>

      <div className="border p-5 rounded-lg shadow space-y-4">

        <p><b>Name:</b> {order.user_name}</p>
        <p><b>Email:</b> {order.email}</p>
        <p><b>Phone:</b> {order.phone}</p>
        <p><b>Address:</b> {order.address}</p>
        <p><b>Pincode:</b> {order.pincode}</p>

        <p className="text-xl font-bold text-orange-600">
          Total: ₹{order.amount / 100}
        </p>

        <p>
          <b>Payment ID:</b> {order.payment_id}
        </p>

        <p>
          <b>Status:</b> {order.status}
        </p>

        <h2 className="text-2xl font-bold mt-6">Items</h2>

        <div className="space-y-3">
          {orderItems?.map((item) => (
            <div key={item.id} className="border p-3 rounded">
              <p><b>{item.products.name}</b></p>
              <p>Qty: {item.quantity}</p>
              <p>₹{item.products.price / 100}</p>
            </div>
          ))}
        </div>

        <form className="mt-6 space-y-3">
          <button
            formAction={updateStatus.bind(null, "paid")}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Mark as Paid
          </button>

          <button
            formAction={updateStatus.bind(null, "shipped")}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Mark as Shipped
          </button>

          <button
            formAction={updateStatus.bind(null, "delivered")}
            className="px-4 py-2 bg-orange-600 text-white rounded"
          >
            Mark as Delivered
          </button>
        </form>

      </div>
    </div>
  );
}
