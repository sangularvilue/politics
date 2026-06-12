import { ResetForm } from "@/components/ResetForm";

export const metadata = { title: "Reset password — Aristotle's Politics" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ResetForm token={token} />;
}
