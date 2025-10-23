import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseClient";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
  const { email } = await req.json();
  
  // Validate email
  if (!email || typeof email !== "string") {
    return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400 });
  }

  // Basic email validation
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(email)) {
    return new Response(JSON.stringify({ error: "Please enter a valid email address" }), { status: 400 });
  }

  try {
    // Check if email already exists in waitlist
    const { data: existingEmail, error: checkError } = await supabaseAdmin
      .from('waitlist')
      .select('email, created_at, status')
      .eq('email', email.toLowerCase())
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Database check error:', checkError);
      return new Response(JSON.stringify({ error: "Database error occurred" }), { status: 500 });
    }

    if (existingEmail) {
      return new Response(JSON.stringify({ 
        error: "This email is already registered on our waitlist!",
        alreadyRegistered: true,
        registeredAt: existingEmail.created_at
      }), { status: 409 }); // 409 Conflict
    }

    // Insert new email into waitlist
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('waitlist')
      .insert([
        { 
          email: email.toLowerCase(),
          source: 'website',
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      
      // Handle unique constraint violation (in case of race condition)
      if (insertError.code === '23505') { // Unique violation
        return new Response(JSON.stringify({ 
          error: "This email is already registered on our waitlist!",
          alreadyRegistered: true
        }), { status: 409 });
      }
      
      return new Response(JSON.stringify({ error: "Failed to join waitlist" }), { status: 500 });
    }

    // Send welcome email
    try {
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        cc: "40230@protonmail.com",
        subject: "Welcome to the Waitlist!",
        html: `
          <div style="background:#18181b;padding:32px 24px;border-radius:16px;color:#fff;font-family:Chakra Petch,sans-serif;text-align:center;max-width:480px;margin:auto;">
          <h1 style="font-size:2rem;font-weight:700;margin-bottom:12px;letter-spacing:1px;">Welcome to the 4V4.DIY Waitlist!</h1>
            <h1 style="font-size:2rem;font-weight:700;margin-bottom:12px;letter-spacing:1px;">Welcome to the 4V4.XYZ Waitlist!</h1>
          <p style="font-size:1.1rem;margin-bottom:18px;">Hey <b>${email}</b>,</p>
          <p style="font-size:1rem;margin-bottom:18px;">We're excited to have you join the revolution in 3D avatars and digital collectibles.<br />
          You'll be the first to know about exclusive drops, updates, and early access opportunities.</p>
          <div style="margin:24px 0;">
                <a href="https://4v4.xyz" style="display:inline-block;padding:12px 32px;background:#ff006a;color:#fff;border-radius:8px;font-weight:600;text-decoration:none;font-size:1.1rem;box-shadow:0 2px 8px #0002;">Visit 4V4.XYZ</a>
          </div>
          <hr style="border:none;border-top:1px solid #333;margin:32px 0;" />
          <p style="color:#898989;font-size:13px;">CYPUNK REVOLT &mdash; The future of avatars is yours.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the request if email fails, user is still added to waitlist
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Successfully joined the waitlist!",
      data: insertData 
    }), { status: 200 });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), { status: 500 });
  }
}
