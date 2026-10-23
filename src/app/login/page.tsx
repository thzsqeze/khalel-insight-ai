import { PublicShell } from "@/components/public/public-shell";
import { PublicLogin } from "@/components/public/login";
import { isDemoMode } from "@/lib/server/config";

export default function LoginPage() {
  const demo = isDemoMode();
  return <PublicShell demo={demo}><PublicLogin demo={demo} /></PublicShell>;
}
