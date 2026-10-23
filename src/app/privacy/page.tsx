import { PublicShell } from "@/components/public/public-shell";
import { Privacy } from "@/components/public/privacy";
import { isDemoMode } from "@/lib/server/config";

export default function PrivacyPage() {
  const demo = isDemoMode();
  return <PublicShell demo={demo}><Privacy demo={demo} /></PublicShell>;
}
