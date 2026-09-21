import Link from "next/link";

export function ListingsViewToggle({ active, search = "" }: { active: "list" | "map"; search?: string }) {
  const query = search ? `?${search}` : "";
  const listHref = `/listing${query}`;
  const mapHref = `/listing/map${query}`;

  return (
    <div style={{ marginLeft: "auto", display: "flex", border: "2px solid #211c19" }}>
      {active === "list" ? (
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.14em", padding: "14px 34px", background: "#211c19", color: "#f4f1ec" }}>LIST</span>
      ) : (
        <Link href={listHref} className="listings-toggle-idle" style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.14em", padding: "14px 34px", color: "#211c19" }}>
          LIST
        </Link>
      )}
      {active === "map" ? (
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.14em", padding: "14px 34px", background: "#211c19", color: "#f4f1ec" }}>MAP</span>
      ) : (
        <Link href={mapHref} className="listings-toggle-idle" style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.14em", padding: "14px 34px", color: "#211c19" }}>
          MAP
        </Link>
      )}
    </div>
  );
}
