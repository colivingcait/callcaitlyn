import Link from "next/link";
import { INITIATIVES } from "@/lib/initiatives";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-soft bg-white">
      <div className="mx-auto max-w-page px-8 py-16 lg:px-[60px]">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <p className="font-heading text-lg font-medium text-charcoal">
              Caitlyn <em>Verdugo</em>
            </p>
            <p className="mt-2 max-w-xs font-sans text-sm text-warmgray">
              A Realtor who thinks like an investor — coliving, house hacking, and buy/sell across the Atlanta metro.
            </p>
          </div>

          <div>
            <p className="font-sans text-xs font-medium uppercase tracking-wide text-charcoal">Site</p>
            <ul className="mt-4 space-y-2 font-sans text-sm text-warmgray">
              <li><Link href="/about" className="hover:text-gold">About</Link></li>
              <li><Link href="/coliving" className="hover:text-gold">Coliving</Link></li>
              <li><Link href="/house-hacking" className="hover:text-gold">House Hacking</Link></li>
              <li><Link href="/work-with-me" className="hover:text-gold">Work With Me</Link></li>
              <li><Link href="/contact" className="hover:text-gold">Contact</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-sans text-xs font-medium uppercase tracking-wide text-charcoal">My communities</p>
            <ul className="mt-4 space-y-2 font-sans text-sm text-warmgray">
              {INITIATIVES.map((item) => (
                <li key={item.url}>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-gold">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-soft pt-6 font-sans text-xs text-warmgray-light">
          <p>&copy; {year} Caitlyn Verdugo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
