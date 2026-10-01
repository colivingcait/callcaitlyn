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
        borderLeft: "2px solid #C4955A",
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
        fontSize: 9,
        fontWeight: 500,
        fontStyle: "normal",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: tone === "light" ? "#E8D5B5" : "#8B6535",
        background: tone === "light" ? "rgba(232,213,181,0.16)" : "rgba(196,149,90,0.12)",
        padding: "3px 6px",
        whiteSpace: "nowrap",
        verticalAlign: "1px",
      }}
    >
      Projected
    </span>
  );
}
