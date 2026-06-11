import Link from "next/link";

export function BrowseTabs({ active }: { active: "books" | "tags" | "authors" }) {
  return (
    <div className="tabs">
      <Link href="/browse" className={active === "books" ? "active" : ""}>By book & chapter</Link>
      <Link href="/browse/tags" className={active === "tags" ? "active" : ""}>By tag</Link>
      <Link href="/browse/authors" className={active === "authors" ? "active" : ""}>By author</Link>
    </div>
  );
}
