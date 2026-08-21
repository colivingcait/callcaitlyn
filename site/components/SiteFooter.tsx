import Link from "next/link";
import { INITIATIVES } from "@/lib/initiatives";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="font-serif text-lg font-semibold text-neutral-900">
              Caitlyn <span className="italic text-brand-500">Verdugo</span>
            </p>
            <p className="mt-2 max-w-xs text-sm text-neutral-500">
              A Realtor who thinks like an investor — coliving, house hacking, and buy/sell across the Atlanta metro.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-neutral-900">Site</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-500">
              <li><Link href="/about" className="hover:text-neutral-900">About</Link></li>
              <li><Link href="/coliving" className="hover:text-neutral-900">Coliving</Link></li>
              <li><Link href="/house-hacking" className="hover:text-neutral-900">House Hacking</Link></li>
              <li><Link href="/work-with-me" className="hover:text-neutral-900">Work With Me</Link></li>
              <li><Link href="/contact" className="hover:text-neutral-900">Contact</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-neutral-900">My communities</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-500">
              {INITIATIVES.map((item) => (
                <li key={item.url}>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-neutral-100 pt-6 text-xs text-neutral-400">
          <p>&copy; {year} Caitlyn Verdugo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
