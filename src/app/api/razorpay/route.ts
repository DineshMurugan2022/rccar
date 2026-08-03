export const runtime = 'edge';
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request: Request) {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });
    
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

    const order = await razorpay.orders.create(options);
    
    return NextResponse.json(order, { status: 200 });
  } catch (error: any) {
    console.error("Razorpay Order Creation Error:", error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' }, 
      { status: 500 }
    );
  }
}

