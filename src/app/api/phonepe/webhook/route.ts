export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { supabase } from '../../../../utils/supabase';

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: Request) {
  try {
    const rawBodyText = await request.text();
    let data;
    try {
      data = JSON.parse(rawBodyText);
    } catch (e) {
      console.error("Webhook payload not JSON");
      return NextResponse.json({ success: false, message: "Invalid payload" }, { status: 400 });
    }
    
    const xVerify = request.headers.get('x-verify') || '';
    if (!xVerify || !data.response) {
      console.error("Missing x-verify or response data");
      return NextResponse.json({ success: false, message: "Missing required headers or data" }, { status: 400 });
    }

    const saltKey = process.env.PHONEPE_CLIENT_SECRET || 'test_client_secret';
    const base64Body = data.response;
    
    // Checksum = sha256(base64Body + saltKey) + ### + saltIndex
    const expectedHash = await sha256(base64Body + saltKey);
    const receivedHash = xVerify.split('###')[0];
    
    if (expectedHash !== receivedHash) {
      console.error("PhonePe Webhook Checksum Mismatch", { expectedHash, receivedHash });
      return NextResponse.json({ success: false, message: "Invalid Signature" }, { status: 400 });
    }
    
    // Decode base64 payload
    const payloadBuffer = Buffer.from(base64Body, 'base64');
    const payload = JSON.parse(payloadBuffer.toString('utf-8'));
    
    if (payload.success && payload.code === 'PAYMENT_SUCCESS') {
      const merchantOrderId = payload.data.merchantTransactionId || payload.data.merchantOrderId;
      console.log(`PhonePe Webhook Success Confirmed for Order: ${merchantOrderId}`);
      
      // Update order status in Supabase
      if (merchantOrderId && process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project-id")) {
        const { error } = await supabase
          .from('orders')
          .update({ status: 'confirmed' })
          .eq('id', merchantOrderId);
          
        if (error) {
          console.error("Supabase Order Update Error via Webhook:", error);
        }
      }
    }
    
    return NextResponse.json({ success: true, message: "Webhook processed securely" }, { status: 200 });
    
  } catch (err: any) {
    console.error("PhonePe Webhook processing error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

