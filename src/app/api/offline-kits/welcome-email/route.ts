
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend('re_dp3BFuwe_P4sm14NiyEyww1wbYCifEJRV');

const SENDER = 'EZCirkit <hello@mail.crabstertech.in>';
const ADMIN_EMAIL = 'crabstertechnology@gmail.com';

// ---------------------------------------------------------------------------
// POST /api/offline-kits/welcome-email
// Body: { name, email, kitId }
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const { name, email, kitId } = await req.json() as {
      name: string;
      email: string;
      kitId: string;
    };

    if (!email || !name || !kitId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const customerHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #F97316; margin-bottom: 4px;">Welcome to EZCirkit, ${name}! 🎉</h1>
        <p style="color: #555;">Your kit has been successfully activated.</p>
        <div style="background: #fff7ed; border-left: 4px solid #F97316; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #333;"><strong>Kit ID:</strong> ${kitId}</p>
          <p style="margin: 8px 0 0; font-size: 14px; color: #555;">Keep this ID handy for warranty claims and support.</p>
        </div>
        <h3 style="color: #333;">You now have access to:</h3>
        <ul style="color: #555; line-height: 2;">
          <li>📺 50+ Video Tutorials</li>
          <li>⚡ Step-by-Step Experiments</li>
          <li>🔌 Circuit Diagrams &amp; Pinouts</li>
          <li>💻 Web-Based Arduino IDE</li>
          <li>📦 Source Code Downloads</li>
          <li>🔄 Free Future Updates</li>
        </ul>
        <a href="https://ezcirkit.com/dashboard" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background-color: #F97316; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Go to Dashboard →
        </a>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #aaa;">Need help? Contact us at crabstertech@gmail.com</p>
      </div>
    `;

    const adminHtml = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #333;">📦 Offline Kit Activated</h2>
        <ul style="list-style: none; padding: 0;">
          <li style="margin-bottom: 10px;"><strong>Kit ID:</strong> ${kitId}</li>
          <li style="margin-bottom: 10px;"><strong>Customer:</strong> ${name} (${email})</li>
        </ul>
        <a href="https://ezcirkit.com/admin/offline-kits" style="display: inline-block; padding: 10px 20px; background-color: #F97316; color: white; text-decoration: none; border-radius: 5px;">View in Admin Panel</a>
      </div>
    `;

    await Promise.all([
      resend.emails.send({
        from: SENDER,
        to: [email],
        subject: `Welcome to EZCirkit! Your kit ${kitId} is now active 🎉`,
        html: customerHtml,
      }),
      resend.emails.send({
        from: SENDER,
        to: [ADMIN_EMAIL],
        subject: `📦 Offline Kit Activated: ${kitId}`,
        html: adminHtml,
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[welcome-email] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
