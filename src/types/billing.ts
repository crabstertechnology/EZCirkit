export interface BillingProduct {
  id: string;
  name: string;
  categoryId?: string;
  category?: string;
  subcategory?: string;
  sku?: string;
  mrp?: number;
  sellingPrice?: number;
  price: number;
  purchasePrice?: number;
  discount?: number;
  tax?: number; // Tax percentage (e.g., 0, 5, 12, 18, 28)
  currentStock?: number;
  stock: number;
  minStockLevel?: number;
  unit?: string;
  image?: string;
  isActive?: boolean;
  createdDate?: string;
  updatedDate?: string;
}

export interface BillingCartItem {
  id: string;
  product: BillingProduct;
  quantity: number;
  customUnitPrice: number;
  discountAmount: number;
  isReturn: boolean;
  returnReason?: 'Customer Return' | 'Customer Exchange' | 'Defective / Damaged' | 'Wrong Item' | string;
}

export interface BillingCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  createdDate?: string;
}

export interface BillingSaleItem {
  id: string;
  saleId: string;
  productId: string;
  sku?: string;
  name: string;
  unit: string;
  quantity: number; // +Q for sold, -Q for returned
  unitPrice: number;
  discount: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  isReturn: boolean;
  returnReason?: string;
}

export interface BillingSale {
  id: string;
  billNumber: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  amount: number; // Gross subtotal
  discount: number; // Cumulative discounts (line + order)
  orderDiscount?: number;
  tax: number; // Cumulative tax
  grandTotal: number;
  paymentMethod: 'cash' | 'upi' | 'online' | 'card' | 'split';
  cashReceived?: number;
  changeReturned?: number;
  status: 'paid' | 'cancelled' | 'refunded' | 'pending';
  date: string; // ISO 8601
  cashierName: string;
  cashierEmail: string;
  itemsCount: number;
  items: BillingSaleItem[];
  notes?: string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  sku?: string;
  quantity: number; // signed delta: -Q for sale, +Q for return/restock, +/- for adjustment
  type: 'opening' | 'purchase' | 'sale' | 'manual_adjustment' | 'damage' | 'return' | 'correction';
  date: string;
  user: string;
  referenceId: string;
  notes: string;
}
