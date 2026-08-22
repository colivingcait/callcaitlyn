import type { Metadata } from "next";
import { Eyebrow } from "@/components/blocks";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch about buying, selling, coliving, or house hacking in Atlanta.",
};

export default function ContactPage() {
  return (
    <section className="reveal mx-auto max-w-2xl px-8 py-20 lg:px-[60px] lg:py-[120px]">
      <Eyebrow>Contact</Eyebrow>
      <h1 className="mt-4 text-h2-lg font-medium text-charcoal">
        Let&apos;s start the <em>conversation.</em>
      </h1>
      <p className="mt-5 text-lg text-warmgray">
        Tell me a bit about what you&apos;re looking to do — I read and respond to every message myself.
      </p>

      <div className="mt-10">
        <ContactForm />
      </div>
    </section>
  );
}
