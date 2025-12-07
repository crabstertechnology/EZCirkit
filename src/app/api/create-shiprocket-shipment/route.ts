'use server';

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';
import 'dotenv/config';

// Define the expected schema for the incoming request body
const shipmentSchema = z.object({
  orderId: z.string(),
  orderDate: z.string(),
  billingCustomerName: z.string(),
  billingAddress: z.string(),
  billingCity: z.string(),
  billingPincode: z.string(),
  billingState: z.string(),
  billingCountry: z.string(),
  billingEmail: z.string().email(),
  billingPhone: z.string(),
  orderItems: z.array(
    z.object({
      name: z.string(),
      sku: z.string(),
      units: z.number(),
      selling_price: z.number(),
    })
  ),
  paymentMethod: z.string(),
  subTotal: z.number(),
  weight: z.number(),
});

type ShipmentRequest = z.infer<typeof shipmentSchema>;

// Simple in-memory cache for the Shiprocket token
interface ShiprocketAuth {
  token: string;
  expiresAt: number;
}
let authCache: ShiprocketAuth | null = null;

/**
 * Gets Shiprocket authentication token, using a cache to avoid re-login on every request.
 */
async function getShiprocketToken(): Promise<string> {
  // 1. Return cached token if it's still valid
  if (authCache && authCache.expiresAt > Date.now()) {
    return authCache.token;
  }

  // 2. Get credentials from environment variables
  const email = process.env.SHIPROCKET_API_EMAIL;
  const password = process.env.SHIPROCKET_API_PASSWORD;

  if (!email || !password) {
    throw new Error('Shiprocket email or password not configured in .env.local');
  }

  // 3. Authenticate with Shiprocket
  try {
    const response = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/auth/login',
      { email, password },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const token = response.data.token;
    if (!token) {
      throw new Error('Authentication response did not include a token.');
    }

    // 4. Cache the token for 9 days (Shiprocket tokens are valid for 10 days)
    authCache = {
      token,
      expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000,
    };

    return token;
  } catch (error: any) {
    console.error("Shiprocket Auth Error:", error.response?.data || error.message);
    throw new Error('Failed to authenticate with Shiprocket.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the incoming data against our schema
    const validation = shipmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid shipment data', details: validation.error.flatten() }, { status: 400 });
    }
    const shipmentRequest: ShipmentRequest = validation.data;

    // Get the auth token (from cache or new login)
    const token = await getShiprocketToken();
    
    // Prepare the order data for Shiprocket
    const shiprocketOrderData = {
      order_id: shipmentRequest.orderId,
      order_date: shipmentRequest.orderDate,
      pickup_location: "Primary", // <-- FIX: Hardcode to "Primary" like the test script
      billing_customer_name: shipmentRequest.billingCustomerName,
      billing_last_name: "", // Shiprocket requires this, even if empty
      billing_address: shipmentRequest.billingAddress,
      billing_address_2: "",
      billing_city: shipmentRequest.billingCity,
      billing_pincode: shipmentRequest.billingPincode,
      billing_state: shipmentRequest.billingState,
      billing_country: shipmentRequest.billingCountry,
      billing_email: shipmentRequest.billingEmail,
      billing_phone: shipmentRequest.billingPhone,
      shipping_is_billing: true,
      order_items: shipmentRequest.orderItems,
      payment_method: shipmentRequest.paymentMethod,
      sub_total: shipmentRequest.subTotal,
      length: 10,
      breadth: 15,
      height: 20,
      weight: shipmentRequest.weight,
    };
    
    // Create the ad-hoc order in Shiprocket
    const response = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
      shiprocketOrderData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    // Return the successful response from Shiprocket
    return NextResponse.json(response.data);

  } catch (error: any) {
    console.error('Error creating Shiprocket shipment:', error.response?.data || error.message);
    // Return a structured error
    return NextResponse.json(
      { 
        error: 'Failed to create shipment.', 
        details: error.response?.data || error.message 
      },
      { status: 500 }
    );
  }
}