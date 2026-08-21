import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";

const SUBJECTS: Record<string, string> = {
  general: "New contact form message",
  buy: "New buyer inquiry",
  sell: "New seller inquiry",
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

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const formType = typeof body.formType === "string" && body.formType in SUBJECTS ? body.formType : "general";
  const fields = Array.isArray(body.fields)
    ? (body.fields as Array<{ label?: unknown; value?: unknown }>)
        .map((f) => ({ label: typeof f.label === "string" ? f.label : "", value: typeof f.value === "string" ? f.value.trim() : "" }))
        .filter((f) => f.label && f.value)
    : [];

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const nameField = fields.find((f) => /name/i.test(f.label));

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    replyTo: email,
    subject: nameField ? `${SUBJECTS[formType]} from ${nameField.value}` : SUBJECTS[formType],
    text: fields.map((f) => `${f.label}: ${f.value}`).join("\n"),
  });

  if (error) {
    console.error("Resend failed to send contact form email", error);
    return NextResponse.json({ error: "Couldn't send that — please try again in a bit." }, { status: 502 });
  }

  return NextResponse.json({ sent: true });
}
