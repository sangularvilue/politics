import Link from "next/link";
import { redirect } from "next/navigation";
import { listByUser, authorName } from "@/lib/store";
import { currentUser } from "@/lib/auth";
import { AnnotationCard } from "@/components/AnnotationCard";

export const dynamic = "force-dynamic";

export default async function AuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await currentUser())) redirect(`/login?next=${encodeURIComponent(`/authors/${id}`)}`);
  const [annotations, name] = await Promise.all([listByUser(id), authorName(id)]);
  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <Link href="/browse/authors" className="eyebrow">← all readers</Link>
      <h1 style={{ fontSize: "2.2rem", margin: ".4rem 0 .3rem" }}>{name}</h1>
      <p className="muted" style={{ marginBottom: "2rem" }}>{annotations.length} annotation{annotations.length === 1 ? "" : "s"}</p>
      {annotations.length === 0 ? (
        <p className="empty">No annotations yet.</p>
      ) : (
        annotations.map((a) => <AnnotationCard key={a.id} a={a} showAuthor={false} />)
      )}
    </div>
  );
}
