// Pure string logic only, zero imports - shared between server send paths
// (email sequences, text blasts) and client-side live-preview UI, which
// needs to render {{first_name}} substitution as the user types without a
// server round trip per keystroke.

export function applyMergeFields(text: string, contact: { first_name: string; last_name: string }) {
  return text
    .replace(/\{\{\s*first_name\s*\}\}/gi, contact.first_name || "")
    .replace(/\{\{\s*last_name\s*\}\}/gi, contact.last_name || "");
}

// Clearly-fake sample data, not a real contact - a test send/preview shows
// merge-field placement and tone, not real personalization.
export const PREVIEW_CONTACT = { first_name: "Jamie", last_name: "Example" };
