import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';
import 'dotenv/config';
import { SHIPPING_CONFIG } from '@/config/shipping';

// Define cache for Shiprocket token
interface ShiprocketAuth {
  token: string;
  expiresAt: number;
}
let authCache: ShiprocketAuth | null = null;

/**
 * Gets Shiprocket authentication token using a cache to avoid logging in on every request.
 */
async function getShiprocketToken(): Promise<string> {
  if (authCache && authCache.expiresAt > Date.now()) {
    return authCache.token;
  }

  const email = process.env.SHIPROCKET_API_EMAIL;
  const password = process.env.SHIPROCKET_API_PASSWORD;

  if (!email || !password) {
    throw new Error('Shiprocket email or password not configured in environment variables');
  }

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

    // Cache the token for 9 days (Shiprocket tokens are valid for 10 days)
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

// Zod schemas for validation
const requestSchema = z.object({
  action: z.enum([
    'serviceability',
    'create-order',
    'assign-awb',
    'pickup',
    'manifest-generate',
    'manifest-print',
    'label-generate',
    'invoice-print',
    'track',
    'cancel'
  ]),
  // serviceability parameters
  pickup_postcode: z.string().optional(),
  delivery_postcode: z.string().optional(),
  weight: z.number().optional(),
  cod: z.union([z.number(), z.boolean()]).optional(),
  length: z.number().optional(),
  breadth: z.number().optional(),
  height: z.number().optional(),

  // order creation parameters (optional, matching shipmentSchema from create-shiprocket-shipment)
  orderData: z.object({
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
  }).optional(),

  // IDs for other operations
  shipment_id: z.number().optional(),
  courier_id: z.number().optional(),
  order_id: z.number().optional(),
  awb_code: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const token = await getShiprocketToken();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    switch (data.action) {
      case 'serviceability': {
        const { 
          pickup_postcode = SHIPPING_CONFIG.pickupPincode, 
          delivery_postcode, 
          weight = 0.5, 
          cod = 0,
          length = 34,
          breadth = 24,
          height = 6
        } = data;
        if (!delivery_postcode) {
          return NextResponse.json({ error: 'Delivery postcode is required for serviceability check' }, { status: 400 });
        }
        
        // cod format for Shiprocket is 1 (yes) or 0 (no)
        const codVal = typeof cod === 'boolean' ? (cod ? 1 : 0) : cod;

        const response = await axios.get(
          'https://apiv2.shiprocket.in/v1/external/courier/serviceability/',
          {
            params: {
              pickup_postcode,
              delivery_postcode,
              weight,
              cod: codVal,
              length,
              breadth,
              height,
            },
            headers,
          }
        );
        return NextResponse.json(response.data);
      }

      case 'create-order': {
        if (!data.orderData) {
          return NextResponse.json({ error: 'Order data is required to create order' }, { status: 400 });
        }
        
        const shiprocketOrderData = {
          order_id: data.orderData.orderId,
          order_date: data.orderData.orderDate,
          pickup_location: "Primary",
          billing_customer_name: data.orderData.billingCustomerName,
          billing_last_name: "",
          billing_address: data.orderData.billingAddress,
          billing_address_2: "",
          billing_city: data.orderData.billingCity,
          billing_pincode: data.orderData.billingPincode,
          billing_state: data.orderData.billingState,
          billing_country: data.orderData.billingCountry,
          billing_email: data.orderData.billingEmail,
          billing_phone: data.orderData.billingPhone,
          shipping_is_billing: true,
          order_items: data.orderData.orderItems,
          payment_method: data.orderData.paymentMethod,
          sub_total: data.orderData.subTotal,
          length: 34,
          breadth: 24,
          height: 6,
          weight: data.orderData.weight,
        };

        const response = await axios.post(
          'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
          shiprocketOrderData,
          { headers }
        );
        return NextResponse.json(response.data);
      }

      case 'assign-awb': {
        const { shipment_id, courier_id } = data;
        if (!shipment_id) {
          return NextResponse.json({ error: 'Shipment ID is required to assign AWB' }, { status: 400 });
        }

        const response = await axios.post(
          'https://apiv2.shiprocket.in/v1/external/courier/assign/awb',
          {
            shipment_id,
            ...(courier_id ? { courier_id } : {}),
          },
          { headers }
        );
        return NextResponse.json(response.data);
      }

      case 'pickup': {
        const { shipment_id } = data;
        if (!shipment_id) {
          return NextResponse.json({ error: 'Shipment ID is required to request pickup' }, { status: 400 });
        }

        const response = await axios.post(
          'https://apiv2.shiprocket.in/v1/external/courier/generate/pickup',
          {
            shipment_id: [shipment_id],
          },
          { headers }
        );
        return NextResponse.json(response.data);
      }

      case 'manifest-generate': {
        const { shipment_id } = data;
        if (!shipment_id) {
          return NextResponse.json({ error: 'Shipment ID is required to generate manifest' }, { status: 400 });
        }

        const response = await axios.post(
          'https://apiv2.shiprocket.in/v1/external/manifests/generate',
          {
            shipment_ids: [shipment_id],
          },
          { headers }
        );
        return NextResponse.json(response.data);
      }

      case 'manifest-print': {
        const { shipment_id } = data;
        if (!shipment_id) {
          return NextResponse.json({ error: 'Shipment ID is required to print manifest' }, { status: 400 });
        }

        const response = await axios.post(
          'https://apiv2.shiprocket.in/v1/external/manifests/print',
          {
            shipment_ids: [shipment_id],
          },
          { headers }
        );
        return NextResponse.json(response.data);
      }

      case 'label-generate': {
        const { shipment_id } = data;
        if (!shipment_id) {
          return NextResponse.json({ error: 'Shipment ID is required to generate label' }, { status: 400 });
        }

        const response = await axios.post(
          'https://apiv2.shiprocket.in/v1/external/courier/generate/label',
          {
            shipment_id: [shipment_id],
          },
          { headers }
        );
        return NextResponse.json(response.data);
      }

      case 'invoice-print': {
        const { order_id } = data;
        if (!order_id) {
          return NextResponse.json({ error: 'Order ID is required to print invoice' }, { status: 400 });
        }

        const response = await axios.post(
          'https://apiv2.shiprocket.in/v1/external/orders/print/invoice',
          {
            ids: [order_id],
          },
          { headers }
        );
        return NextResponse.json(response.data);
      }

      case 'track': {
        const { awb_code } = data;
        if (!awb_code) {
          return NextResponse.json({ error: 'AWB code is required for tracking' }, { status: 400 });
        }

        const response = await axios.get(
          `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb_code}`,
          { headers }
        );
        return NextResponse.json(response.data);
      }

      case 'cancel': {
        const { order_id } = data;
        if (!order_id) {
          return NextResponse.json({ error: 'Order ID is required to cancel' }, { status: 400 });
        }

        const response = await axios.post(
          'https://apiv2.shiprocket.in/v1/external/orders/cancel',
          { ids: [order_id] },
          { headers }
        );
        return NextResponse.json(response.data);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Shiprocket API Error:', error.response?.data || error.message);
    return NextResponse.json(
      {
        error: 'Shiprocket request failed',
        details: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}
