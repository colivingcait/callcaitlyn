import { listStages, listTags, listMergeCandidates } from "@/lib/data/contacts";
import { ContactForm } from "@/components/contacts/ContactForm";

export default async function NewContactPage() {
  const [stages, tags, existingContacts] = await Promise.all([listStages(), listTags(), listMergeCandidates()]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-neutral-900">Add contact</h1>
      <ContactForm stages={stages} tags={tags} existingContacts={existingContacts} />
    </div>
  );
}
