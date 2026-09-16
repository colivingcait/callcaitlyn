import type { SupabaseClient } from "@supabase/supabase-js";

// Human-readable, from the address, rather than a random token - this is a
// link she shares like a Zillow link, so it should read like one.
function slugify(address: string): string {
  return (
    address
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "listing"
  );
}

// Appends -2, -3, etc. on collision - two listings can share a street name
// across different cities, so a plain slugify isn't guaranteed unique.
export async function generateUniqueListingSlug(admin: SupabaseClient, address: string): Promise<string> {
  const base = slugify(address);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const { data } = await admin.from("listings").select("id").eq("public_slug", candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${suffix}`;
    suffix++;
  }
}
