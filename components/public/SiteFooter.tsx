import { PUBLIC_SITE_URL, publicSiteUrl } from "@/lib/public-urls";
import styles from "./SiteFooter.module.css";

// ColivingCait components/Footer.tsx. Plain <a> tags so these links leave
// the CRM app. Site paths are absolute www URLs. Instagram stays the
// external profile from that component. YouTube, Facebook, and LinkedIn
// are still placeholders there (`#`); they point at the www home so the
// click does not stay on this app.
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

export function SiteFooter() {
  return (
    <footer className={`${styles.footer} public-site-footer`} data-om-noprint>
      <div className={styles.grid}>
        <div>
          <a href={PUBLIC_SITE_URL} className={styles.wordmark}>
            Coliving<em>Cait</em>
          </a>
          <p className={styles.tagline}>
            Helping you build wealth through real estate — one door at a time. Atlanta-based investor, coach, and Keller Williams Realtor.
          </p>
        </div>

        <div>
          <h4 className={styles.heading}>Navigate</h4>
          <ul className={styles.list}>
            {navigate.map((link) => (
              <li key={link.label}>
                <a href={publicSiteUrl(link.href)} className={styles.link}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className={styles.heading}>Connect</h4>
          <ul className={styles.list}>
            {connect.map((link) =>
              link.external ? (
                <li key={link.label}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    {link.label}
                  </a>
                </li>
              ) : (
                <li key={link.label}>
                  <a href={publicSiteUrl(link.href)} className={styles.link}>
                    {link.label}
                  </a>
                </li>
              ),
            )}
          </ul>
        </div>
      </div>

      <div className={styles.bar}>
        <span className={styles.fine}>© 2026 Coliving Cait · Lustra House LLC</span>
        <a href="mailto:colivingcait@gmail.com" className={styles.email}>
          colivingcait@gmail.com
        </a>
      </div>
    </footer>
  );
}
