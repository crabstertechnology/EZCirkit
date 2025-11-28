"use client";

import { useCartStore } from "@/store/cartStore";
import Link from "next/link";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQty = useCartStore((state) => state.updateQty);

  const total = items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  if (items.length === 0) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-3xl font-bold mb-6">Your Cart is Empty</h1>
        <Link href="/products" className="text-orange-500 underline">
          Go to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6">Your Cart</h1>

      <div className="space-y-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="border p-4 rounded-lg flex justify-between items-center"
          >
            <div>
              <h2 className="text-xl font-semibold">{item.name}</h2>
              <p className="text-gray-500">
                ₹{item.price / 100} × {item.quantity}
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <button
                className="px-3 py-1 bg-gray-200 rounded"
                onClick={() =>
                  updateQty(item.id, Math.max(1, item.quantity - 1))
                }
              >
                -
              </button>

              <span>{item.quantity}</span>

              <button
                className="px-3 py-1 bg-gray-200 rounded"
                onClick={() => updateQty(item.id, item.quantity + 1)}
              >
                +
              </button>

              <button
                className="px-3 py-1 bg-red-500 text-white rounded"
                onClick={() => removeItem(item.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-bold mt-10">
        Total: ₹{(total / 100).toLocaleString("en-IN")}
      </h2>

      <Link
        href="/checkout"
        className="mt-6 inline-block bg-orange-600 text-white px-6 py-3 rounded-lg"
      >
        Proceed to Checkout
      </Link>
    </div>
  );
}
