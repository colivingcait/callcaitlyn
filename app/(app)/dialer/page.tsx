import { listDialerQueue } from "@/lib/data/dialer";
import { listStages } from "@/lib/data/contacts";
import { DialerQueue } from "@/components/dialer/DialerQueue";

export default async function DialerPage() {
  const [{ contacts, error }, stages] = await Promise.all([listDialerQueue(), listStages()]);

  return (
    <div className="mx-auto max-w-2xl overflow-x-hidden">
      <div className="px-4 pt-6 pb-2">
        <h1 className="font-serif text-2xl font-semibold text-neutral-900">Dialer</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          {contacts.length} to call — newest leads first, so you can reach people fast.
        </p>
      </div>
      {error && (
        <p className="mx-4 mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          Couldn&apos;t load the dialer queue: {error}. This usually means a database migration hasn&apos;t been run yet
          — check with your developer.
        </p>
      )}
      <DialerQueue contacts={contacts} stages={stages} />
    </div>
  );
}
