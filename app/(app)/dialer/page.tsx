import { listDialerQueue } from "@/lib/data/dialer";
import { listStages } from "@/lib/data/contacts";
import { DialerQueue } from "@/components/dialer/DialerQueue";

export default async function DialerPage() {
  const [contacts, stages] = await Promise.all([listDialerQueue(), listStages()]);

  return (
    <div className="mx-auto max-w-2xl overflow-x-hidden">
      <div className="px-4 pt-6 pb-2">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900">Dialer</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          {contacts.length} to call — newest leads first, so you can reach people fast.
        </p>
      </div>
      <DialerQueue contacts={contacts} stages={stages} />
    </div>
  );
}
