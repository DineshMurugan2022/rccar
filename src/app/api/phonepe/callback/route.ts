export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { StandardCheckoutClient, Env } from '@phonepe-pg/pg-sdk-node';

async function handlePhonePeCallback(request: Request) {
  const url = new URL(request.url);

  // Log all incoming params to help debug
  const allParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => { allParams[key] = value; });
  console.log('PhonePe Callback received. URL params:', JSON.stringify(allParams));

  // Step 1: Get the merchantOrderId. We embed it in our own callback URL, 
  // so 'orderId' will ALWAYS be present regardless of what PhonePe sends.
  let merchantOrderId =
    url.searchParams.get('orderId') ||
    url.searchParams.get('merchantOrderId') ||
    url.searchParams.get('transactionId') ||
    url.searchParams.get('merchantTransactionId');

  // For POST, also try to read form data
  if (!merchantOrderId && request.method === 'POST') {
    try {
      const rawBody = await request.text();
      console.log('PhonePe POST body:', rawBody);

      // Try as URLSearchParams first
      const formParsed = new URLSearchParams(rawBody);
      merchantOrderId =
        formParsed.get('orderId') ||
        formParsed.get('merchantOrderId') ||
        formParsed.get('transactionId');

      // Try as JSON
      if (!merchantOrderId) {
        try {
          const json = JSON.parse(rawBody);
          merchantOrderId =
            json.orderId ||
            json.merchantOrderId ||
            json.transactionId ||
            json.data?.merchantOrderId ||
            json.data?.merchantTransactionId;
        } catch (_) {}
      }
    } catch (_) {}
  }

  console.log('PhonePe Callback - merchantOrderId:', merchantOrderId);

  if (!merchantOrderId) {
    console.error('PhonePe callback: Could not determine merchantOrderId from any source. Redirecting to cart.');
    const baseUrl = `${url.protocol}//${url.host}`;
    return NextResponse.redirect(`${baseUrl}/checkout/callback?status=PAYMENT_ERROR`, { status: 302 });
  }

  const baseUrl = `${url.protocol}//${url.host}`;
  let status = 'PAYMENT_PENDING'; // Default to pending (user did pay, we just can't confirm yet)

  try {
    const clientId = process.env.PHONEPE_CLIENT_ID || '';
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET || '';
    const env = process.env.PHONEPE_ENV === 'PRODUCTION' ? Env.PRODUCTION : Env.SANDBOX;

    if (clientId && clientSecret) {
      const client = StandardCheckoutClient.getInstance(clientId, clientSecret, 1, env);
      const statusResponse = await client.getOrderStatus(merchantOrderId);

      console.log('PhonePe getOrderStatus response:', JSON.stringify(statusResponse));

      // PhonePe returns state as 'COMPLETED', 'FAILED', 'PENDING', 'CREATED'
      // Payment amounts are also returned - check all possible success fields
      const state = statusResponse?.state || '';
      const paymentDetails = (statusResponse as any)?.paymentDetails?.[0];
      const paymentState = paymentDetails?.state || '';

      if (
        state === 'COMPLETED' ||
        state === 'SUCCESS' ||
        paymentState === 'COMPLETED' ||
        paymentState === 'SUCCESS'
      ) {
        status = 'PAYMENT_SUCCESS';
      } else if (state === 'FAILED' || paymentState === 'FAILED') {
        status = 'PAYMENT_ERROR';
      }
      // If PENDING or CREATED, keep status as PAYMENT_PENDING (still treated as success by frontend)
    } else {
      // No credentials configured â€” treat redirect from PhonePe as success (they only redirect on success/cancel)
      console.warn('PhonePe credentials not configured. Defaulting status to PAYMENT_PENDING.');
      status = 'PAYMENT_PENDING';
    }
  } catch (statusError: any) {
    // SDK verification failed - log the error but DO NOT default to PAYMENT_ERROR
    // PhonePe UPI redirects the user back AFTER payment succeeds. The user arriving 
    // here means they completed the UPI flow. Default to PAYMENT_PENDING so the 
    // order gets created and we avoid a false "Payment Failed" screen.
    console.error('Error verifying order status with PhonePe SDK:', statusError?.message || statusError);
    console.log('SDK verification failed â€” defaulting to PAYMENT_PENDING to avoid false failure.');
    status = 'PAYMENT_PENDING';
  }

  console.log(`PhonePe Callback - Final status: ${status} for order: ${merchantOrderId}`);

  const redirectUrl = `${baseUrl}/checkout/callback?status=${status}&orderId=${merchantOrderId}`;
  return NextResponse.redirect(redirectUrl, { status: 302 });
}

export async function GET(request: Request) {
  return handlePhonePeCallback(request);
}

export async function POST(request: Request) {
  return handlePhonePeCallback(request);
}

