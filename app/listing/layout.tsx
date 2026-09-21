import { Newsreader, Archivo } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./om.css";

// Deliberate deviation from the rest of the CRM (Inter + Fraunces): this is
// a public marketing surface, not app chrome, and the design spec calls for
// Newsreader (display) + Archivo (UI) specifically. Scoped to this route
// only, not the app-wide root layout.
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-om-serif",
  weight: ["400", "500", "600"],
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-om-sans",
  weight: ["400", "500", "600"],
  display: "swap",
});

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${newsreader.variable} ${archivo.variable}`}>{children}</div>;
}
