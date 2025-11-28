import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default async function AdminOrdersPage() {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return <div className="p-10">Failed to load orders.</div>;
  }

  return (
    <div className="p-5">
      <h1 className="text-3xl font-bold mb-6">Orders</h1>

      <div className="space-y-6">
        {orders?.map((order) => (
          <Link
            key={order.id}
            href={`/admin/orders/${order.id}`}
            className="block border rounded-lg p-5 shadow-sm hover:shadow-lg transition"
          >
            <div className="flex justify-between">
              <div>
                <p className="font-semibold text-xl">{order.user_name}</p>
                <p className="text-gray-500">{order.email}</p>
                <p className="text-gray-500">{order.phone}</p>

                <p className="mt-2">
                  <b>Address:</b> {order.address}
                </p>

                <p>
                  <b>Pincode:</b> {order.pincode}
                </p>

                <p className="mt-3 text-orange-600 font-bold text-lg">
                  ₹{order.amount / 100}
                </p>
              </div>

              <div className="text-right">
                <p>
                  <b>Status:</b> {order.status}
                </p>
                <p>
                  <b>Payment ID:</b> {order.payment_id}
                </p>

                <p className="text-sm text-gray-500 mt-2">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
