import Link from "next/link";
import { listAuthors } from "@/lib/store";
import { BrowseTabs } from "@/components/BrowseTabs";

export const dynamic = "force-dynamic";

export default async function BrowseAuthorsPage() {
  const authors = await listAuthors(200);
  return (
    <div className="wrap">
      <h1 style={{ fontSize: "2rem", marginBottom: ".3rem" }}>Browse</h1>
      <p className="muted" style={{ marginBottom: "1.5rem" }}>Readers annotating the Politics.</p>
      <BrowseTabs active="authors" />
      {authors.length === 0 ? (
        <p className="empty">No annotations yet. Be the first.</p>
      ) : (
        authors.map((a) => (
          <Link key={a.id} href={`/authors/${a.id}`} className="list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem" }}>{a.name}</span>
            <span className="mono" style={{ fontSize: ".72rem", color: "var(--accent)" }}>{a.count} annotation{a.count === 1 ? "" : "s"}</span>
          </Link>
        ))
      )}
    </div>
  );
}
