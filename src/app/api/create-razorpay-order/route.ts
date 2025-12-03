
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { z } from 'zod';
import 'dotenv/config';

const orderSchema = z.object({
  amount: z.number().positive(),
  currency: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = orderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { amount, currency } = validation.data;

    const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      throw new Error('Razorpay API keys are not configured in environment variables.');
    }
    
    // The 'new' keyword is critical here and was missing.
    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const options = {
      amount,
      currency,
      receipt: `receipt_order_${new Date().getTime()}`,
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json(
      { error: 'Could not create order.', details: error.message },
      { status: 500 }
    );
  }
}
