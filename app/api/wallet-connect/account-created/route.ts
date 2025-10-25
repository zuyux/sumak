import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, address } = await request.json();
    if (!email || !address) {
      return NextResponse.json({ error: 'Missing email or address' }, { status: 400 });
    }
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const html = `
      <h2>Welcome to SUMAK!</h2>
      <p>Your account has been created.</p>
      <p><strong>Address:</strong> ${address}</p>
      <p>Keep your mnemonic safe. Never share it with anyone.</p>
    `;
    await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'SUMAK Account Created',
      html,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send account created email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
