import { listContacts, listStages, listTags } from "@/lib/data/contacts";
import { ContactRow } from "@/components/contacts/ContactRow";
import { ContactFilters } from "@/components/contacts/ContactFilters";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; tag?: string; type?: string }>;
}) {
  const params = await searchParams;
  const [contacts, stages, tags] = await Promise.all([
    listContacts({ q: params.q, stageId: params.stage, tagId: params.tag, type: params.type }),
    listStages(),
    listTags(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="px-4 pt-6 pb-2">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900">Contacts</h1>
        <p className="mt-0.5 text-sm text-neutral-500">{contacts.length} people</p>
      </div>
      <ContactFilters stages={stages} tags={tags} />
      <div className="bg-white">
        {contacts.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">No contacts match. Try clearing filters or add a new contact.</p>
        ) : (
          contacts.map((c) => <ContactRow key={c.id} contact={c} />)
        )}
      </div>
    </div>
  );
}
