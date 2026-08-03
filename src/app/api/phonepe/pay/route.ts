export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { StandardCheckoutClient, Env, StandardCheckoutPayRequest } from '@phonepe-pg/pg-sdk-node';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, isCodAdvance } = body; // Amount in rupees

    if (!amount) {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
    }

    const clientId = process.env.PHONEPE_CLIENT_ID || 'test_client_id';
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET || 'test_client_secret';
    // If PHONEPE_ENV is PRODUCTION, use Env.PRODUCTION, otherwise Env.SANDBOX
    const env = process.env.PHONEPE_ENV === 'PRODUCTION' ? Env.PRODUCTION : Env.SANDBOX;
    const clientVersion = 1;

    const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);
    
    // Convert to paise
    const amountInPaise = Math.round(amount * 100);
    const prefix = isCodAdvance ? 'CODADV' : 'ORDER';
    const merchantOrderId = `${prefix}_${Date.now()}_${uuidv4().substring(0, 8)}`;
    
    // Construct the callback URL
    // Try to get base URL dynamically if possible, or fallback to localhost
    let baseUrl = 'http://localhost:3000';
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    } else if (request.headers.get('host')) {
      const protocol = request.headers.get('host')?.includes('localhost') ? 'http' : 'https';
      baseUrl = `${protocol}://${request.headers.get('host')}`;
    }
    
    const callbackUrl = `${baseUrl}/api/phonepe/callback?orderId=${merchantOrderId}`;

    const payRequest = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amountInPaise)
      .redirectUrl(callbackUrl) // PhonePe will redirect back here
      .build();

    const response = await client.pay(payRequest);
    
    return NextResponse.json({ 
      id: merchantOrderId, 
      redirectUrl: response.redirectUrl 
    }, { status: 200 });

  } catch (error: any) {
    console.error("PhonePe Initiation Error:", error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize payment' }, 
      { status: 500 }
    );
  }
}

