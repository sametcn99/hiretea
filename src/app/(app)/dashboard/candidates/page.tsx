import { UserRole } from "@prisma/client";
import { Grid } from "@radix-ui/themes";
import { CandidateProvisionForm } from "@/app/(app)/dashboard/candidates/components/candidate-provision-form";
import { CandidateTable } from "@/app/(app)/dashboard/candidates/components/candidate-table";
import { SectionCard } from "@/components/ui/section-card";
import { requireRole } from "@/lib/auth/session";
import { listCandidates } from "@/lib/candidates/queries";

export default async function CandidatesPage() {
  await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const candidates = await listCandidates();

  return (
    <Grid columns={{ initial: "1fr", lg: "minmax(320px, 380px) minmax(0, 1fr)" }} gap="4" align="start">
      <SectionCard
        style={{ position: "sticky", top: 28 }}
        title="Provision a candidate"
        description="Create the local candidate record and the matching self-hosted Gitea account in one action."
        eyebrow="Candidate operations"
      >
        <CandidateProvisionForm />
      </SectionCard>

      <SectionCard
        title="Provisioned candidates"
        description="This list is backed by local application data, not by direct Gitea reads, so the app stays authoritative about the hiring workflow."
        eyebrow="Current roster"
      >
        <CandidateTable candidates={candidates} />
      </SectionCard>
    </Grid>
  );
}
