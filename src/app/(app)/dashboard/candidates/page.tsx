import { UserRole } from "@prisma/client";
import { CandidateProvisionForm } from "@/app/(app)/dashboard/candidates/components/candidate-provision-form";
import { CandidateTable } from "@/app/(app)/dashboard/candidates/components/candidate-table";
import styles from "@/app/(app)/dashboard/candidates/page.module.css";
import { SectionCard } from "@/components/ui/section-card";
import { requireRole } from "@/lib/auth/session";
import { listCandidates } from "@/lib/candidates/queries";

export default async function CandidatesPage() {
  await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const candidates = await listCandidates();

  return (
    <div className={styles.grid}>
      <SectionCard
        className={styles.formCard}
        title="Provision a candidate"
        description="Create the local candidate record and the matching self-hosted Gitea account in one action."
        eyebrow="Candidate operations"
      >
        <CandidateProvisionForm />
      </SectionCard>

      <SectionCard
        className={styles.tableCard}
        title="Provisioned candidates"
        description="This list is backed by local application data, not by direct Gitea reads, so the app stays authoritative about the hiring workflow."
        eyebrow="Current roster"
      >
        <CandidateTable candidates={candidates} />
      </SectionCard>
    </div>
  );
}
