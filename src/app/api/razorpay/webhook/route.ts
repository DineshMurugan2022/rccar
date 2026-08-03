export const runtime = 'edge';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '../../../../utils/supabase';

/**
 * Razorpay Webhook Verification Endpoint
 * 
 * This route receives server-to-server webhook callbacks from Razorpay
 * and cryptographically verifies the payment signature before updating
 * the order status in Supabase.
 * 
 * Configure this URL in your Razorpay Dashboard:
 * Settings -> Webhooks -> Add New Webhook
 * URL: https://yourdomain.com/api/razorpay/webhook
 * Events: payment.captured, payment.failed
 */

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Validate configuration
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Cryptographically verify the webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Razorpay webhook signature mismatch');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Signature verified â€” parse the payload
    const event = JSON.parse(body);
    const eventType = event.event;

    if (eventType === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const rzpPaymentId = payment.id;
      const orderId = payment.notes?.order_id; // We pass our order ID in notes during checkout

      if (orderId) {
        // Update the order in Supabase to mark as verified paid
        const { error: dbError } = await supabase
        .from("orders")
        .update({ payment_status: "paid", payment_id: rzpPaymentId, status: "confirmed" })
        .eq("id", orderId);

        if (dbError) {
          console.error('Failed to update order in Supabase:', dbError.message);
        } else {
          console.log(`âœ… Order ${orderId} verified and marked as paid via webhook`);
        }
      }
    }

    if (eventType === 'payment.failed') {
      const payment = event.payload.payment.entity;
      const orderId = payment.notes?.order_id;

      if (orderId) {
        await supabase
          .from('orders')
          .update({
            payment_status: 'failed',
            status: 'cancelled',
          })
          .eq('id', orderId);

        console.log(`âŒ Order ${orderId} marked as failed via webhook`);
      }
    }

    // Always return 200 to Razorpay to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook processing error:', error.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

