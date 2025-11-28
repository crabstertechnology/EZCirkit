"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";

export default function PaymentPage() {
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  const [checkoutInfo, setCheckoutInfo] = useState<any>(null);

  useEffect(() => {
    const info = localStorage.getItem("checkout-info");
    setCheckoutInfo(JSON.parse(info || "{}"));
  }, []);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function handlePayment() {
    // 1. Create Order
    const res = await fetch("/api/create-order", {
      method: "POST",
      body: JSON.stringify({ amount: total }),
    });

    const { order_id, key } = await res.json();

    // 2. Open Razorpay Popup
    const options = {
      key,
      amount: total,
      currency: "INR",
      name: "EZCirkit Store",
      description: "Electronics Kit",
      order_id,
      handler: async function (response: any) {
        // 3. Verify Payment
        const verifyRes = await fetch("/api/verify-payment", {
          method: "POST",
          body: JSON.stringify({
            ...response,
            order_details: {
              items,
              checkoutInfo,
              amount: total,
            },
          }),
        });

        const data = await verifyRes.json();

        if (data.success) {
          clearCart();
          window.location.href = "/success";
        }
      },
      prefill: {
        name: checkoutInfo?.name,
        email: checkoutInfo?.email,
        contact: checkoutInfo?.phone,
      },
      theme: {
        color: "#F97316",
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  }

  return (
    <div className="p-10 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Payment</h1>

      <h2 className="text-xl font-semibold">Total Amount:</h2>
      <p className="text-2xl font-bold text-orange-600 mb-6">
        ₹{total / 100}
      </p>

      <button
        onClick={handlePayment}
        className="bg-orange-600 text-white px-6 py-3 rounded-lg text-lg"
      >
        Pay Now
      </button>
    </div>
  );
}
