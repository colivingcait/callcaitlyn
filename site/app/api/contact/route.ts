import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";

const INTEREST_LABELS: Record<string, string> = {
  house_hacking: "House hacking",
  coliving: "Coliving / room rental",
  womens_investors: "Atlanta Women Investors",
  other: "Something else",
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !toEmail || !fromEmail) {
    console.error("Contact form submitted but RESEND_API_KEY/CONTACT_TO_EMAIL/CONTACT_FROM_EMAIL is not configured");
    return NextResponse.json({ error: "This form isn't set up yet — email me directly instead." }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const interest = typeof body.interest === "string" ? body.interest : "other";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    replyTo: email,
    subject: `New contact form message from ${name}`,
    text: [
      `Name: ${name}`,
      `Email: ${email}`,
      phone && `Phone: ${phone}`,
      `Interested in: ${INTEREST_LABELS[interest] ?? interest}`,
      "",
      message || "(no message)",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  if (error) {
    console.error("Resend failed to send contact form email", error);
    return NextResponse.json({ error: "Couldn't send that — please try again in a bit." }, { status: 502 });
  }

  return NextResponse.json({ sent: true });
}
