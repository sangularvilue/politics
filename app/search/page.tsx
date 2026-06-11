import { Suspense } from "react";
import { SearchView } from "@/components/SearchView";

export const metadata = { title: "Search — Aristotle's Politics" };

export default function SearchPage() {
  return (
    <Suspense>
      <SearchView />
    </Suspense>
  );
}
