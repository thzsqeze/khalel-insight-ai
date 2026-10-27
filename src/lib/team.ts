export const teamRoles = ["owner", "admin", "moderator", "viewer"] as const;
export type TeamRole = (typeof teamRoles)[number];
export interface TeamMember {
  id: string;
  email: string;
  role: TeamRole;
  confirmed: boolean;
  invited: boolean;
}
export interface TeamPage {
  members: TeamMember[];
  page: number;
  hasNext: boolean;
}
