import { IssueDetail } from "@/components/admin/issue-detail";
export default async function IssuePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <IssueDetail id={id} />; }
