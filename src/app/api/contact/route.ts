export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

export async function POST(request: Request) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: 'MARQUE Contact Form <onboarding@resend.dev>', 
      to: ['2002dineshmurugan@gmail.com'],
      subject: `New Contact Form Submission: ${subject || 'No Subject'}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #020617; color: #f8fafc; padding: 20px; border-radius: 8px;">
          <h1 style="color: #f97316; text-transform: uppercase;">New Contact Submission</h1>
          
          <div style="background-color: #0f172a; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #1e293b;">
            <p style="margin-top: 0;"><strong>Pilot Name:</strong> ${name}</p>
            <p><strong>Comms Channel:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject || 'N/A'}</p>
          </div>
          
          <div style="background-color: #0f172a; padding: 15px; border-radius: 6px; border: 1px solid #1e293b;">
            <h2 style="color: #e2e8f0; font-size: 16px; text-transform: uppercase; margin-top: 0;">Message Payload</h2>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          
          <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">This dispatch was sent from the MARQUE contact form.</p>
        </div>
      `
    });

    if (error) {
      console.error("Resend Error:", error);
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (error: any) {
    console.error("Contact Form Sending Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

