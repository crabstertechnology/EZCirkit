"use client";

import { useEffect, useState } from "react";

export default function EditProductPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);

  const id = params.id;

  useEffect(() => {
    async function fetchProduct() {
      const res = await fetch(`/api/admin/product/${id}`);
      const data = await res.json();
      setProduct(data.product);
      setLoading(false);
    }
    fetchProduct();
  }, [id]);

  async function handleUpdate(e: any) {
    e.preventDefault();

    const updated = {
      name: product.name,
      description: product.description,
      price: Number(product.price) * 100,
      stock: Number(product.stock),
      is_active: product.is_active,
    };

    const res = await fetch(`/api/admin/product/${id}`, {
      method: "PUT",
      body: JSON.stringify(updated),
    });

    const data = await res.json();

    if (data.success) {
      alert("Product updated!");
      window.location.href = "/admin/products";
    } else {
      alert("Error updating product");
    }
  }

  if (loading) return <div className="p-10">Loading...</div>;

  return (
    <div className="p-10 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Edit Product</h1>

      <form onSubmit={handleUpdate} className="space-y-4">
        <input
          className="w-full p-3 border rounded"
          value={product.name}
          onChange={(e) =>
            setProduct({ ...product, name: e.target.value })
          }
        />

        <textarea
          className="w-full p-3 border rounded"
          value={product.description}
          onChange={(e) =>
            setProduct({ ...product, description: e.target.value })
          }
        />

        <input
          className="w-full p-3 border rounded"
          placeholder="Price (in rupees)"
          value={product.price / 100}
          onChange={(e) =>
            setProduct({ ...product, price: Number(e.target.value) * 100 })
          }
        />

        <input
          className="w-full p-3 border rounded"
          value={product.stock}
          onChange={(e) =>
            setProduct({ ...product, stock: e.target.value })
          }
        />

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={product.is_active}
            onChange={(e) =>
              setProduct({ ...product, is_active: e.target.checked })
            }
          />
          Active Product
        </label>

        <button className="w-full bg-blue-600 text-white py-3 rounded">
          Save Changes
        </button>
      </form>
    </div>
  );
}
