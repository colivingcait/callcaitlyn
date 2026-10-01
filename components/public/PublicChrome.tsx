import { cormorant, dmSans } from "./fonts";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";

// Header and footer for public listing and booking pages only.
export function PublicChrome({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`${cormorant.variable} ${dmSans.variable} public-with-site-nav ${className}`}>
      <SiteNav />
      {children}
      <SiteFooter />
    </div>
  );
}
