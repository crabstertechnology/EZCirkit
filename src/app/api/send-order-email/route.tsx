
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend('re_dp3BFuwe_P4sm14NiyEyww1wbYCifEJRV');

export async function POST(req: Request) {
  try {
    const { orderId, customerEmail, customerName, total, items, shippingAddress } = await req.json();

    const adminEmail = 'crabstertechnology@gmail.com';
    const senderEmail = 'hello@mail.crabstertech.in';

    // 1. Send Confirmation to Customer
    const customerEmailPromise = resend.emails.send({
      from: `EZCirkit <${senderEmail}>`,
      to: [customerEmail],
      subject: `Order Confirmation #${orderId.substring(0, 7)}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h1 style="color: #FF6600;">Thank you for your order, ${customerName}!</h1>
          <p>We've received your order <strong>#${orderId}</strong> and are getting it ready for shipment.</p>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          
          <h3>Order Details</h3>
          <table style="width: 100%; text-align: left; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #eee;">
                <th style="padding: 10px 0;">Item</th>
                <th style="padding: 10px 0;">Qty</th>
                <th style="padding: 10px 0; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item: any) => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0;">${item.name}</td>
                  <td style="padding: 10px 0;">${item.quantity}</td>
                  <td style="padding: 10px 0; text-align: right;">₹${(item.price * item.quantity).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="text-align: right; padding-top: 20px;">
            <p style="margin: 0; font-size: 18px;"><strong>Total Paid: ₹${total.toLocaleString()}</strong></p>
          </div>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <h4 style="margin-top: 0; color: #333;">Shipping To:</h4>
            <p style="margin-bottom: 0; font-size: 14px; color: #666; line-height: 1.5;">
              <strong>${shippingAddress.name}</strong><br />
              ${shippingAddress.addressLine1}${shippingAddress.addressLine2 ? ', ' + shippingAddress.addressLine2 : ''}<br />
              ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}<br />
              ${shippingAddress.country}
            </p>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; color: #999; text-align: center;">
            Need help? Contact us at crabstertech@gmail.com
          </p>
        </div>
      `,
    });

    // 2. Send Notification to Admin (You)
    const adminEmailPromise = resend.emails.send({
      from: `EZCirkit Alerts <${senderEmail}>`,
      to: [adminEmail],
      subject: `🚀 New Order Received: #${orderId.substring(0, 7)}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #333;">New Sales Alert!</h2>
          <p>A new order has been placed on EZCirkit.</p>
          <ul style="list-style: none; padding: 0;">
            <li style="margin-bottom: 10px;"><strong>Order ID:</strong> ${orderId}</li>
            <li style="margin-bottom: 10px;"><strong>Customer:</strong> ${customerName} (${customerEmail})</li>
            <li style="margin-bottom: 10px;"><strong>Amount:</strong> ₹${total.toLocaleString()}</li>
          </ul>
          <p style="margin-top: 20px;">Check the admin dashboard for full details and shipment status.</p>
          <a href="https://shop.crabstertech.in/admin/orders" style="display: inline-block; padding: 10px 20px; background-color: #FF6600; color: white; text-decoration: none; border-radius: 5px;">View Order</a>
        </div>
      `,
    });

    // Wait for both emails to be sent
    await Promise.all([customerEmailPromise, adminEmailPromise]);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Email API Error:', error);
    return NextResponse.json({ error: 'Failed to send emails', details: error.message }, { status: 500 });
  }
}
