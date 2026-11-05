import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { BillingCustomer } from '@/types/billing';

// -------------------------------------------------------------
// GET: Fetch all customers with sales aggregations (orders & spend)
// -------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const db = await getAdminDb();
    const [custSnap, salesSnap] = await Promise.all([
      db.collection('customers').orderBy('name', 'asc').limit(500).get(),
      db.collection('sales').select('customerId', 'customerPhone', 'grandTotal', 'date', 'status').get(),
    ]);

    // Build customer spend & order statistics
    const statsMap = new Map<string, { totalOrders: number; totalSpent: number; lastDate: string }>();

    salesSnap.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'cancelled') return;

      const custId = data.customerId || (data.customerPhone ? `cust-${data.customerPhone.replace(/\D/g, '')}` : null);
      if (!custId) return;

      const existing = statsMap.get(custId) || { totalOrders: 0, totalSpent: 0, lastDate: '' };
      existing.totalOrders += 1;
      existing.totalSpent += Number(data.grandTotal) || 0;
      if (!existing.lastDate || new Date(data.date).getTime() > new Date(existing.lastDate).getTime()) {
        existing.lastDate = data.date;
      }
      statsMap.set(custId, existing);
    });

    const customers: BillingCustomer[] = custSnap.docs.map((doc) => {
      const data = doc.data();
      const stats = statsMap.get(doc.id) || { totalOrders: 0, totalSpent: 0, lastDate: '' };

      return {
        id: doc.id,
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        createdDate: data.createdDate || '',
        updatedDate: data.updatedDate || '',
        totalOrders: stats.totalOrders || data.totalOrders || 0,
        totalSpent: stats.totalSpent || data.totalSpent || 0,
        lastPurchaseDate: stats.lastDate || data.lastPurchaseDate || '',
        notes: data.notes || '',
      };
    });

    return NextResponse.json({ customers });
  } catch (err: any) {
    console.error('Failed to fetch customers from Admin DB:', err);
    return NextResponse.json({ customers: [] }, { status: 500 });
  }
}

// -------------------------------------------------------------
// POST: Add or Register a Customer manually
// -------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email = '', address = '', notes = '' } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const now = new Date().toISOString();

    const db = await getAdminDb();

    // Deterministic ID by phone if available, or random safe ID
    const customerId = cleanPhone ? `cust-${cleanPhone}` : `cust-${Date.now()}`;
    const customerRef = db.collection('customers').doc(customerId);

    const customerData: BillingCustomer = {
      id: customerId,
      name: name.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      address: address.trim(),
      notes: notes.trim(),
      createdDate: now,
      updatedDate: now,
      totalOrders: 0,
      totalSpent: 0,
    };

    await customerRef.set(customerData, { merge: true });

    return NextResponse.json({ success: true, customer: customerData });
  } catch (err: any) {
    console.error('Failed to save customer:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

// -------------------------------------------------------------
// PUT: Update an existing customer
// -------------------------------------------------------------
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, phone, email = '', address = '', notes = '' } = body;

    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const now = new Date().toISOString();

    const db = await getAdminDb();
    const customerRef = db.collection('customers').doc(id);

    const updateData: Partial<BillingCustomer> = {
      name: name.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      address: address.trim(),
      notes: notes.trim(),
      updatedDate: now,
    };

    await customerRef.update(updateData);

    return NextResponse.json({ success: true, customer: { id, ...updateData } });
  } catch (err: any) {
    console.error('Failed to update customer:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

// -------------------------------------------------------------
// DELETE: Delete a customer
// -------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const db = await getAdminDb();
    await db.collection('customers').doc(id).delete();

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('Failed to delete customer:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
