import type { Metadata } from "next";
import { Eyebrow } from "@/components/blocks";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch about buying, selling, coliving, or house hacking in Atlanta.",
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Eyebrow>Contact</Eyebrow>
      <h1 className="mt-4 font-serif text-3xl font-semibold text-neutral-900 sm:text-4xl">
        Let&apos;s start the <span className="italic text-brand-500">conversation.</span>
      </h1>
      <p className="mt-5 text-lg text-neutral-600">
        Tell me a bit about what you&apos;re looking to do — I read and respond to every message myself.
      </p>

      <div className="mt-10">
        <ContactForm />
      </div>
    </section>
  );
}
