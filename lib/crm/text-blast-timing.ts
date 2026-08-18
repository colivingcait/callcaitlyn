// Pure constants, no imports - safe for client components (the blast
// modal) and server components (the Dashboard status card) alike. Mirrors
// the actual cron cadence/batch size in lib/crm/text-blasts.ts and
// vercel.json's send-text-blasts schedule - keep these in sync if either
// changes.
export const TEXT_BLAST_SENDS_PER_RUN = 8;
export const TEXT_BLAST_RUN_INTERVAL_MINUTES = 15;

export function estimatedTextBlastMinutes(pendingCount: number): number {
  if (pendingCount <= 0) return 0;
  return Math.ceil(pendingCount / TEXT_BLAST_SENDS_PER_RUN) * TEXT_BLAST_RUN_INTERVAL_MINUTES;
}
