import { notFound } from "next/navigation";
import { getContact, listStages, listTags } from "@/lib/data/contacts";
import { ContactForm } from "@/components/contacts/ContactForm";

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [contact, stages, tags] = await Promise.all([getContact(id), listStages(), listTags()]);

  if (!contact) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-neutral-900">Edit contact</h1>
      <ContactForm contact={contact} stages={stages} tags={tags} />
    </div>
  );
}
