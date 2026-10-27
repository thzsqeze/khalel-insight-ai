import type { Metadata } from "next";
import { InvitationSetup } from "@/components/public/invitation-setup";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function SetupPasswordPage() {
  return <InvitationSetup />;
}
