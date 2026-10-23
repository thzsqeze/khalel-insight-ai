import { PublicShell } from "@/components/public/public-shell";
import { PublicIssues } from "@/components/public/public-issues";
import { isDemoMode } from "@/lib/server/config";

export default function IssuesPage() {
  const demo = isDemoMode();
  return <PublicShell demo={demo}><PublicIssues demo={demo} /></PublicShell>;
}
