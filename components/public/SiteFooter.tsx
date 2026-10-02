import kwLogo from "@/assets/brand/kw-logo.png";
import { PUBLIC_SITE_URL, publicSiteUrl } from "@/lib/public-urls";
import "./site-footer.css";

// Approved ColivingCait site footer. Public listing and booking pages only
// (PublicChrome). Paths are absolute www URLs, the same ones SiteNav uses.
// The KW mark is a static import so Next serves it under the /crm-static
// assetPrefix and the www proxy can load it.

const navigateA = [
  { href: "/about", label: "About" },
  { href: "/what-is-coliving", label: "What Is Coliving" },
  { href: "/learn", label: "Learn With Me" },
  { href: "/partner-with-me", label: "Partner With Me" },
];

const navigateB = [
  { href: "/buy-and-sell", label: "Buy & Sell" },
  { href: "/listings", label: "Listings" },
  { href: "/community", label: "Community" },
  { href: "/calculator", label: "Calculators" },
];

function EqualHousingIcon() {
  return (
    <svg viewBox="5 3 140 103" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M74.887 3.35 5.105 39.072v14.538l7.721.103V105.775h123.6l-.065-52.164h8.308V39.075L74.886 3.353zm47.773 88.675H26.577V45.719l48.311-24.921 47.768 24.921V92.025zM52.042 57.888h45.273V45.384H52.042v12.504zm0 22.488h45.07V67.872h-45.07v12.504z"
      />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer data-om-noprint className="public-site-footer site-footer">
      <div className="ftop">
        <a className="brand" href={PUBLIC_SITE_URL}>
          Coliving<em>Cait</em>
        </a>
        <p>Helping you build wealth through real estate, one door at a time.</p>
      </div>

      <div className="grid g3">
        <div>
          <h4>Navigate</h4>
          <ul>
            {navigateA.map((item) => (
              <li key={item.href}>
                <a href={publicSiteUrl(item.href)}>{item.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>&nbsp;</h4>
          <ul>
            {navigateB.map((item) => (
              <li key={item.href}>
                <a href={publicSiteUrl(item.href)}>{item.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Connect</h4>
          <ul>
            <li>
              <a href="tel:+16788844494">678-884-4494</a>
            </li>
            <li>
              <a href="mailto:CV.SellsHomes@gmail.com">CV.SellsHomes@gmail.com</a>
            </li>
          </ul>
          <a className="fbook" href={publicSiteUrl("/book")}>
            BOOK A MEETING
          </a>
        </div>
      </div>

      <div className="broker">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="kwimg" src={kwLogo.src} alt="Keller Williams Realty Metro Atlanta" />
        <div className="btxt">
          <b>Keller Williams Realty Metro Atlanta</b>
          <span>Caitlyn Verdugo, Realtor® · Licensed in Georgia · 678-884-4494</span>
          <span>101 W Ponce de Leon Ave, Decatur, GA 30030 · Office 404-564-5560</span>
          <span className="ind">Each office is independently owned and operated.</span>
        </div>
        <div className="eho">
          <EqualHousingIcon />
          Equal Housing Opportunity
        </div>
      </div>

      <div className="legal">
        <span>© 2026 Coliving Cait</span>
        <span>Keller Williams Realty Metro Atlanta</span>
      </div>
    </footer>
  );
}
