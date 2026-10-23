import { Landing } from "@/components/public/landing";
import { PublicShell } from "@/components/public/public-shell";
import { isDemoMode } from "@/lib/server/config";

export default function HomePage() {
  const demo = isDemoMode();
  return <PublicShell demo={demo}><Landing demo={demo} /></PublicShell>;
}
