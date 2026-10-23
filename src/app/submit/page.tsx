import { PublicShell } from "@/components/public/public-shell";
import { SubmissionForm } from "@/components/public/submission-form";
import { isDemoMode } from "@/lib/server/config";

export default function SubmitPage() {
  const demo = isDemoMode();
  return <PublicShell demo={demo}><SubmissionForm demo={demo} /></PublicShell>;
}
