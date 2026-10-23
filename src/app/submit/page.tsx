import { PublicShell } from "@/components/public/public-shell";
import { SubmissionForm } from "@/components/public/submission-form";
import { categories } from "@/lib/types";

export default async function SubmitPage({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  const { category } = await searchParams;
  const initialCategory = typeof category === "string" ? categories.find(value => value === category) : undefined;
  return <PublicShell><SubmissionForm key={initialCategory ?? "all"} initialCategory={initialCategory} /></PublicShell>;
}
