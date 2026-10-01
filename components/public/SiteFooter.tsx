import { PUBLIC_SITE_URL, publicSiteUrl } from "@/lib/public-urls";

// Port of ColivingCait components/Footer.tsx. Same structure and Tailwind
// classes. Site paths are absolute www URLs. Instagram stays the external
// profile. YouTube, Facebook, and LinkedIn are still "#" there; they point
// at the www home so the click does not stay on this app.
// font-dm / font-heading stand in for that site's body and h4 base styles.

const navigate = [
  { href: "/about", label: "About" },
  { href: "/what-is-coliving", label: "What Is Coliving" },
  { href: "/learn", label: "Learn With Me" },
  { href: "/partner-with-me", label: "Partner With Me" },
  { href: "/buy-and-sell", label: "Buy & Sell" },
  { href: "/calculator", label: "Calculators" },
];

const connect: { href: string; label: string; external: boolean }[] = [
  { href: "/community", label: "Community", external: false },
  { href: "/contact", label: "Contact", external: false },
  { href: "https://instagram.com/colivingcait", label: "Instagram", external: true },
  { href: `${PUBLIC_SITE_URL}/#`, label: "YouTube", external: true },
  { href: `${PUBLIC_SITE_URL}/#`, label: "Facebook", external: true },
  { href: `${PUBLIC_SITE_URL}/#`, label: "LinkedIn", external: true },
];

const linkClass = "text-[13px] text-warmgray-light hover:text-white transition-colors duration-200";

export function SiteFooter() {
  return (
    <footer
      data-om-noprint
      className="public-site-footer bg-charcoal px-8 lg:px-[60px] border-t border-white/[0.04] font-dm font-light leading-[1.8] antialiased"
    >
      <div className="mx-auto grid w-full max-w-[1320px] gap-10 py-14 md:gap-[60px] md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <a href={PUBLIC_SITE_URL} className="font-heading text-xl font-normal text-white hover:opacity-70 transition-opacity inline-block">
            Coliving<em className="italic font-light text-gold-light">Cait</em>
          </a>
          <p className="mt-3 max-w-[280px] text-[13px] leading-[1.6] text-warmgray">
            Helping you build wealth through real estate — one door at a time. Atlanta-based investor, coach, and Keller Williams Realtor.
          </p>
        </div>

        <div>
          <h4 className="mb-5 font-heading text-[10px] font-medium uppercase leading-[1.1] tracking-[0.15em] text-gold">Navigate</h4>
          <ul className="flex flex-col gap-3 list-none">
            {navigate.map((l) => (
              <li key={l.label}>
                <a href={publicSiteUrl(l.href)} className={linkClass}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-5 font-heading text-[10px] font-medium uppercase leading-[1.1] tracking-[0.15em] text-gold">Connect</h4>
          <ul className="flex flex-col gap-3 list-none">
            {connect.map((l) =>
              l.external ? (
                <li key={l.label}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    {l.label}
                  </a>
                </li>
              ) : (
                <li key={l.label}>
                  <a href={publicSiteUrl(l.href)} className={linkClass}>
                    {l.label}
                  </a>
                </li>
              ),
            )}
          </ul>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-2 border-t border-white/[0.06] py-6 text-center md:flex-row md:items-center md:justify-between md:text-left">
        <span className="text-[11px] text-warmgray">© 2026 Coliving Cait · Lustra House LLC</span>
        <a href="mailto:colivingcait@gmail.com" className="text-[11px] text-warmgray-light hover:text-gold transition-colors duration-200">
          colivingcait@gmail.com
        </a>
      </div>
    </footer>
  );
}
