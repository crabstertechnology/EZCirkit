import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/orders" className="block text-xl underline">
        View Orders
      </Link>

      <Link href="/admin/products" className="block text-xl underline">
        Manage Products
      </Link>
    </div>
  );
}
