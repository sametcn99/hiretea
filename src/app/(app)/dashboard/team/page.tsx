import { UserRole } from "@prisma/client";
import { Grid } from "@radix-ui/themes";
import { SectionCard } from "@/components/ui/section-card";
import { requireRole } from "@/lib/auth/session";
import { listRecruiters } from "@/lib/recruiters/queries";
import { RecruiterProvisionForm } from "./components/recruiter-provision-form";
import { RecruiterTable } from "./components/recruiter-table";

export default async function TeamPage() {
  await requireRole(UserRole.ADMIN);
  const recruiters = await listRecruiters();

  return (
    <Grid
      columns={{ initial: "1fr", lg: "minmax(320px, 380px) minmax(0, 1fr)" }}
      gap="4"
      align="start"
    >
      <SectionCard
        style={{ position: "sticky", top: 28 }}
        title="Provision a recruiting team member"
        description="Create the local recruiter record, the matching self-hosted Gitea account, and the organization team access in one action."
        eyebrow="Admin only"
      >
        <RecruiterProvisionForm />
      </SectionCard>

      <SectionCard
        title="Recruiting team roster"
        description="Admins manage onboarding history here. Recruiters can use the dashboard after sign-in but cannot access this user management surface."
        eyebrow="Workspace members"
      >
        <RecruiterTable recruiters={recruiters} />
      </SectionCard>
    </Grid>
  );
}
