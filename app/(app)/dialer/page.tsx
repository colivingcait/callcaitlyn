import { listDialerContacts } from "@/lib/data/dialer";
import { listStages } from "@/lib/data/contacts";
import { DialerCard } from "@/components/dialer/DialerCard";
import { createClient } from "@/lib/supabase/server";

export default async function DialerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [contacts, stages] = await Promise.all([listDialerContacts(), listStages()]);

  const newCount = contacts.filter((c) => !c.lastCallAt).length;

  return (
    <div className="mx-auto max-w-2xl overflow-x-hidden">
      <div className="px-4 pt-6 pb-2">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900">Dialer</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          {contacts.length === 0
            ? "Nobody with a phone number yet."
            : `${newCount} new lead${newCount === 1 ? "" : "s"} to call · ${contacts.length} total`}
        </p>
      </div>
      <div className="bg-white">
        {contacts.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">
            Anyone with a phone number - from a form submission, import, or manual entry - shows up here to call.
          </p>
        ) : (
          user && contacts.map((c) => <DialerCard key={c.id} contact={c} ownerId={user.id} stages={stages} />)
        )}
      </div>
    </div>
  );
}
