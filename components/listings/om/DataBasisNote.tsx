import { projectedOpexNote } from "@/lib/listings/data-basis";

// Buyer-facing only. The sentence lives in data-basis.ts so the public page
// and the unlocked stack stay on the same wording.
export function DataBasisNote({ note, marginTop = 18 }: { note?: string | null; marginTop?: number }) {
  return (
    <p
      className="om-basis-note"
      style={{
        margin: `${marginTop}px 0 0`,
        maxWidth: "68ch",
        borderLeft: "2px solid #cc4a37",
        paddingLeft: 14,
        fontSize: 14,
        lineHeight: 1.65,
        color: "#574f47",
      }}
    >
      {projectedOpexNote(note)}
    </p>
  );
}

export function ProjectedMark({ tone = "ink" }: { tone?: "ink" | "light" }) {
  return (
    <span
      style={{
        marginLeft: 8,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        color: tone === "light" ? "#e9a396" : "#a33a29",
        whiteSpace: "nowrap",
      }}
    >
      Projected
    </span>
  );
}
