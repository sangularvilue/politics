import Link from "next/link";
import { topTags } from "@/lib/store";
import { BrowseTabs } from "@/components/BrowseTabs";

export const dynamic = "force-dynamic";

export default async function BrowseTagsPage() {
  const tags = await topTags(200);
  return (
    <div className="wrap">
      <h1 style={{ fontSize: "2rem", marginBottom: ".3rem" }}>Browse</h1>
      <p className="muted" style={{ marginBottom: "1.5rem" }}>Themes readers have tagged across the Politics.</p>
      <BrowseTabs active="tags" />
      {tags.length === 0 ? (
        <p className="empty">No tags yet. Add some when you annotate a passage.</p>
      ) : (
        <div className="tag-cloud">
          {tags.map((t) => (
            <Link key={t.tag} href={`/tags/${t.tag}`}>#{t.tag}<span className="ct">{t.count}</span></Link>
          ))}
        </div>
      )}
    </div>
  );
}
