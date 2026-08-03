export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, isCodAdvance } = body; // Amount in rupees

    if (!amount) {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
    }

    const merchantId = process.env.PHONEPE_CLIENT_ID || 'test_client_id';
    const saltKey = process.env.PHONEPE_CLIENT_SECRET || 'test_client_secret';
    const saltIndex = 1;
    const isProduction = process.env.PHONEPE_ENV === 'PRODUCTION';
    const phonepeHost = isProduction ? 'https://api.phonepe.com/apis/hermes' : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
    
    // Convert to paise
    const amountInPaise = Math.round(amount * 100);
    const prefix = isCodAdvance ? 'CODADV' : 'ORDER';
    const merchantOrderId = `${prefix}_${Date.now()}_${uuidv4().substring(0, 8)}`;
    
    // Construct the callback URL
    let baseUrl = 'http://localhost:3000';
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    } else if (request.headers.get('host')) {
      const protocol = request.headers.get('host')?.includes('localhost') ? 'http' : 'https';
      baseUrl = `${protocol}://${request.headers.get('host')}`;
    }
    
    const callbackUrl = `${baseUrl}/api/phonepe/callback?orderId=${merchantOrderId}`;

    const payload = {
      merchantId: merchantId,
      merchantTransactionId: merchantOrderId,
      merchantUserId: `MUID_${uuidv4().substring(0, 8)}`,
      amount: amountInPaise,
      redirectUrl: callbackUrl,
      redirectMode: "REDIRECT",
      callbackUrl: callbackUrl,
      paymentInstrument: {
        type: "PAY_PAGE"
      }
    };

    // Convert payload to Base64 using standard Edge API (btoa instead of Buffer)
    const base64Payload = btoa(JSON.stringify(payload));
    const endpoint = "/pg/v1/pay";
    const dataToHash = base64Payload + endpoint + saltKey;
    
    const hash = await sha256(dataToHash);
    const checksum = `${hash}###${saltIndex}`;

    const response = await fetch(`${phonepeHost}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum
      },
      body: JSON.stringify({ request: base64Payload })
    });

    const responseData = await response.json();
    
    if (!responseData.success) {
      throw new Error(responseData.message || 'PhonePe payment initialization failed');
    }

    const redirectUrl = responseData.data?.instrumentResponse?.redirectInfo?.url;
    
    return NextResponse.json({ 
      id: merchantOrderId, 
      redirectUrl: redirectUrl 
    }, { status: 200 });

  } catch (error: any) {
    console.error("PhonePe Initiation Error:", error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize payment' }, 
      { status: 500 }
    );
  }
}

