import Link from "next/link";
import { INITIATIVES } from "@/lib/initiatives";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="font-serif text-lg font-semibold text-neutral-900">Caitlyn Verdugo</p>
            <p className="mt-2 max-w-xs text-sm text-neutral-500">
              Real estate, house hacking, and community-building in Atlanta.
            </p>
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

          <div>
            <p className="text-sm font-semibold text-neutral-900">Site</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-500">
              <li><Link href="/about" className="hover:text-neutral-900">About</Link></li>
              <li><Link href="/events" className="hover:text-neutral-900">Events</Link></li>
              <li><Link href="/contact" className="hover:text-neutral-900">Contact</Link></li>
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
