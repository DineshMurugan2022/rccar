export const runtime = 'edge';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Razorpay keys not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { amount } = body; // Amount should be in INR rupees

    if (!amount) {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
    }

    // Razorpay expects the amount in the smallest currency unit (paise for INR)
    const options = {
      amount: Math.round(amount * 100), 
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const basicAuth = btoa(`${keyId}:${keySecret}`);

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.description || 'Failed to create Razorpay order');
    }

    const order = await response.json();
    
    return NextResponse.json(order, { status: 200 });
  } catch (error: any) {
    console.error("Razorpay Order Creation Error:", error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' }, 
      { status: 500 }
    );
  }
}

