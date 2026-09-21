import { NextResponse } from "next/server";

// Stub for the full-OM PDF. The template (cover, page order, gated tables)
// is the next design session. This does not render line-item financials:
// a public URL must not leak unlocked numbers. Print-to-PDF of the unlocked
// offering page is the interim path (see app/listing/om.css @media print).
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Full OM — template pending</title>
  <style>
    @page { size: letter; margin: 0.6in; }
    body { margin: 0; background: #f4f1ec; color: #211c19; font: 15px/1.6 Archivo, ui-sans-serif, sans-serif; }
    main { max-width: 640px; margin: 48px auto; padding: 0 24px; }
    h1 { font-weight: 600; font-size: 28px; line-height: 1.15; }
    a { color: #a33a29; }
  </style>
</head>
<body>
  <main>
    <p style="letter-spacing:.16em;font-size:12px;color:#a33a29;">FULL OM · PDF TEMPLATE PENDING</p>
    <h1>The full offering memorandum PDF is not designed yet.</h1>
    <p>Line-item financials, CapEx, and occupancy history belong in this document once the template exists. This stub does not include those numbers.</p>
    <p>Until then, open the unlocked offering and use the browser print dialog. Print CSS is already on the page.</p>
    <p><a href="/listing/${encodeURIComponent(slug)}">Back to the offering</a></p>
  </main>
</body>
</html>`;
  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
