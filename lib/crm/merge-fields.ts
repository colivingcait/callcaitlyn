// Pure string logic only, zero imports - shared between server send paths
// (email sequences, text blasts) and client-side live-preview UI, which
// needs to render {{first_name}} substitution as the user types without a
// server round trip per keystroke.

export function applyMergeFields(text: string, contact: { first_name: string; last_name: string }) {
  return text
    .replace(/\{\{\s*first_name\s*\}\}/gi, contact.first_name || "")
    .replace(/\{\{\s*last_name\s*\}\}/gi, contact.last_name || "");
}

// Same test find-or-create-contact.ts's enrichContact already uses to decide
// whether an incoming name is worth overwriting - a contact created from a
// bare phone number (Quo) or email with no name ever collected has
// first_name set to that phone/email as a placeholder (see
// findOrCreateContact's insert), not "Unknown" - both look like a filled-in
// name to a naive truthiness check, but neither is a real one to greet
// someone by. Exported here too so any bulk send using {{first_name}} can
// check before personalizing "Hi {{first_name}}" into "Hi 5739992048".
export function hasPlaceholderName(contact: { first_name: string; phone?: string | null; email?: string | null }): boolean {
  return !contact.first_name || contact.first_name === "Unknown" || contact.first_name === contact.phone || contact.first_name === contact.email;
}

// True only when the message would actually try to greet someone by name -
// a broadcast that never uses {{first_name}} has nothing to protect against
// regardless of what's on file.
export function usesFirstNameMergeField(text: string): boolean {
  return /\{\{\s*first_name\s*\}\}/i.test(text);
}

// Clearly-fake sample data, not a real contact - a test send/preview shows
// merge-field placement and tone, not real personalization.
export const PREVIEW_CONTACT = { first_name: "Jamie", last_name: "Example" };
