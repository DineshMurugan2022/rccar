export const runtime = 'edge';
import { NextResponse } from 'next/server';


export async function POST(request: Request) {
  try {
    const { orderId, email, name, totalAmount, items, shippingAddress, paymentMethod, advancePaidAmount } = await request.json();

    if (!orderId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const itemsHtml = items.map((item: any) => `
      <div style="padding: 10px 0; border-bottom: 1px solid #334155;">
        <p style="margin: 0; color: #f8fafc;"><strong>${item.product.name}</strong> x ${item.qty}</p>
        <p style="margin: 5px 0 0; color: #94a3b8; font-size: 14px;">Variant: ${item.variant.name}</p>
      </div>
    `).join('');

    const addressHtml = shippingAddress ? `
      <p style="margin: 5px 0;">${shippingAddress.name}<br/>
      ${shippingAddress.addressLine}<br/>
      ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}<br/>
      Phone: ${shippingAddress.phone}</p>
    ` : 'Address details not provided.';

    const resendApiKey = process.env.RESEND_API_KEY || 're_placeholder';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'MARQUE RC <onboarding@resend.dev>',
        to: [email],
        bcc: ['marque0125@gmail.com'],
        subject: `Order Confirmation - ${orderId}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #020617; color: #f8fafc; padding: 20px; border-radius: 8px;">
            <h1 style="color: #f97316; text-transform: uppercase;">Order Confirmed!</h1>
            <p>Hi ${name || 'Racer'},</p>
            <p>Thank you for choosing MARQUE RC. We've received your order <strong>${orderId}</strong> and we're getting it ready for dispatch.</p>
            
            <div style="background-color: #0f172a; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #1e293b;">
              <h2 style="color: #e2e8f0; font-size: 16px; text-transform: uppercase; margin-top: 0;">Order Summary</h2>
              <p style="font-size: 18px; color: #f97316; margin-bottom: 5px;"><strong>Total Amount:</strong> ₹${totalAmount.toLocaleString('en-IN')}</p>
              ${paymentMethod === 'COD' && advancePaidAmount !== undefined ? `
                <p style="font-size: 14px; color: #4ade80; margin: 5px 0;"><strong>Advance Paid:</strong> ₹${advancePaidAmount.toLocaleString('en-IN')}</p>
                <p style="font-size: 16px; color: #fbbf24; margin-top: 5px; margin-bottom: 20px;"><strong>Balance Due on Delivery:</strong> ₹${(totalAmount - advancePaidAmount).toLocaleString('en-IN')}</p>
              ` : '<div style="margin-bottom: 20px;"></div>'}
              
              <h3 style="color: #cbd5e1; font-size: 14px; margin-bottom: 10px;">Items Ordered:</h3>
              ${itemsHtml}
              
              <h3 style="color: #cbd5e1; font-size: 14px; margin-top: 20px; margin-bottom: 5px;">Shipping Address:</h3>
              <div style="color: #94a3b8; font-size: 14px;">
                ${addressHtml}
              </div>
            </div>
            
            <p style="color: #94a3b8; font-size: 12px;">You will receive another email with your tracking AWB number once the package ships.</p>
            <p style="color: #f97316; font-weight: bold; margin-top: 30px;">Keep Bashing,<br/>The MARQUE Team</p>
          </div>
        `
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend Error:", data);
      return NextResponse.json({ error: data }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (error: any) {
    console.error("Email Sending Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

