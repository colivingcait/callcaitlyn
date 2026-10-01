export function ListingsViewToggle({
  active,
  search = "",
  soldHref = "/listings#sold",
}: {
  active: "list" | "map";
  search?: string;
  soldHref?: string;
}) {
  const query = search ? `?${search}` : "";
  const listHref = `/listings${query}`;
  const mapHref = `/listings/map${query}`;

  return (
    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18 }}>
      <a href={soldHref} style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", color: "#1C1917", textDecoration: "none", whiteSpace: "nowrap" }}>
        RECENTLY SOLD
      </a>
      <div style={{ display: "flex", border: "1px solid #1C1917" }}>
      {active === "list" ? (
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", padding: "12px 28px", background: "#1C1917", color: "#fff" }}>LIST</span>
      ) : (
        <a href={listHref} className="listings-toggle-idle" style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", padding: "12px 28px", color: "#1C1917" }}>
          LIST
        </a>
      )}
      {active === "map" ? (
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", padding: "12px 28px", background: "#1C1917", color: "#fff" }}>MAP</span>
      ) : (
        <a href={mapHref} className="listings-toggle-idle" style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", padding: "12px 28px", color: "#1C1917" }}>
          MAP
        </a>
      )}
      </div>
    </div>
  );
}
