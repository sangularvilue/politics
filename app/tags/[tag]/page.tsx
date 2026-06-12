import Link from "next/link";
import { redirect } from "next/navigation";
import { listByTag } from "@/lib/store";
import { currentUser } from "@/lib/auth";
import { AnnotationCard } from "@/components/AnnotationCard";

export const dynamic = "force-dynamic";

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  if (!(await currentUser())) redirect(`/login?next=${encodeURIComponent(`/tags/${tag}`)}`);
  const annotations = await listByTag(tag);
  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <Link href="/browse/tags" className="eyebrow">← all tags</Link>
      <h1 style={{ fontSize: "2.2rem", margin: ".4rem 0 .3rem" }}>#{tag}</h1>
      <p className="muted" style={{ marginBottom: "2rem" }}>{annotations.length} annotation{annotations.length === 1 ? "" : "s"}</p>
      {annotations.length === 0 ? (
        <p className="empty">Nothing tagged #{tag} yet.</p>
      ) : (
        annotations.map((a) => <AnnotationCard key={a.id} a={a} />)
      )}
    </div>
  );
}
