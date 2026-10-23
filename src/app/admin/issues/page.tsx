import { Suspense } from "react";
import { IssueList } from "@/components/admin/issue-list";
import { DashboardSkeleton } from "@/components/admin/shared";
export default function IssuesPage() { return <Suspense fallback={<DashboardSkeleton />}><IssueList /></Suspense>; }
