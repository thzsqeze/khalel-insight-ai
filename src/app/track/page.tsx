import { PublicShell } from "@/components/public/public-shell";
import { Tracking } from "@/components/public/tracking";
import { isDemoMode } from "@/lib/server/config";

export default function TrackPage() {
  const demo = isDemoMode();
  return <PublicShell demo={demo}><Tracking demo={demo} /></PublicShell>;
}
