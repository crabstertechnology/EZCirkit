"use client";

import { useCartStore } from "@/store/cartStore";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
  });

  const total = items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  const handleSubmit = (e: any) => {
    e.preventDefault();

    // Store order info temporarily before payment
    localStorage.setItem("checkout-info", JSON.stringify(form));

    router.push("/payment");
  };

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full p-3 border rounded"
          placeholder="Full Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          className="w-full p-3 border rounded"
          placeholder="Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          className="w-full p-3 border rounded"
          placeholder="Phone Number"
          required
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />

        <textarea
          className="w-full p-3 border rounded"
          placeholder="Address"
          required
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />

        <input
          className="w-full p-3 border rounded"
          placeholder="City"
          required
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />

        <input
          className="w-full p-3 border rounded"
          placeholder="Pincode"
          required
          value={form.pincode}
          onChange={(e) => setForm({ ...form, pincode: e.target.value })}
        />

        <button
          type="submit"
          className="w-full bg-orange-600 text-white py-3 rounded text-lg"
        >
          Proceed to Payment
        </button>
      </form>

      <h2 className="text-2xl font-bold mt-10">
        Total: ₹{(total / 100).toLocaleString()}
      </h2>
    </div>
  );
}
