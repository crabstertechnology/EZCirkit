"use client";

import { useState } from "react";

export default function AddProductPage() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    is_active: true,
  });

  async function handleSubmit(e: any) {
    e.preventDefault();

    const priceInPaise = Number(form.price) * 100;

    const res = await fetch("/api/admin/add-product", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        price: priceInPaise,
        stock: Number(form.stock),
      }),
    });

    const data = await res.json();

    if (data.success) {
      alert("Product added successfully!");
      window.location.href = "/admin/products";
    } else {
      alert("Something went wrong!");
    }
  }

  return (
    <div className="max-w-xl mx-auto p-10">
      <h1 className="text-3xl font-bold mb-6">Add New Product</h1>

      <form className="space-y-4" onSubmit={handleSubmit}>
        
        <input
          className="w-full p-3 border rounded"
          placeholder="Product Name"
          required
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <textarea
          className="w-full p-3 border rounded"
          placeholder="Description"
          required
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <input
          className="w-full p-3 border rounded"
          placeholder="Price (in rupees)"
          required
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />

        <input
          className="w-full p-3 border rounded"
          placeholder="Stock"
          required
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
        />

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm({ ...form, is_active: e.target.checked })
            }
          />
          Active Product
        </label>

        <button
          type="submit"
          className="w-full bg-orange-600 text-white py-3 rounded"
        >
          Add Product
        </button>
      </form>
    </div>
  );
}
