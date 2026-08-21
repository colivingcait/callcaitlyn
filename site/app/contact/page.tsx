import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch about house hacking, coliving, or Atlanta Women Investors.",
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-600">Contact</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold text-neutral-900 sm:text-4xl">
        Let&apos;s start the conversation.
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
