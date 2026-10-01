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
      <a href={soldHref} style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.14em", color: "#211c19", textDecoration: "none", whiteSpace: "nowrap" }}>
        RECENTLY SOLD
      </a>
      <div style={{ display: "flex", border: "2px solid #211c19" }}>
      {active === "list" ? (
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.14em", padding: "14px 34px", background: "#211c19", color: "#f4f1ec" }}>LIST</span>
      ) : (
        <a href={listHref} className="listings-toggle-idle" style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.14em", padding: "14px 34px", color: "#211c19" }}>
          LIST
        </a>
      )}
      {active === "map" ? (
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.14em", padding: "14px 34px", background: "#211c19", color: "#f4f1ec" }}>MAP</span>
      ) : (
        <a href={mapHref} className="listings-toggle-idle" style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.14em", padding: "14px 34px", color: "#211c19" }}>
          MAP
        </a>
      )}
      </div>
    </div>
  );
}
