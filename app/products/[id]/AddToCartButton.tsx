"use client";

import { useCartStore } from "@/store/cartStore";

interface Product {
  id: string;
  name: string;
  price: number;
}

export default function AddToCartButton({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);

  return (
    <button
      className="mt-6 px-6 py-3 bg-orange-600 text-white rounded-lg"
      onClick={() =>
        addItem({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        })
      }
    >
      Add to Cart
    </button>
  );
}
