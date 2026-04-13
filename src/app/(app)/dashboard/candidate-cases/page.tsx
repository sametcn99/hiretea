import { UserRole } from "@prisma/client";
import { CandidateCaseCreateForm } from "@/app/(app)/dashboard/candidate-cases/components/candidate-case-create-form";
import { CandidateCaseTable } from "@/app/(app)/dashboard/candidate-cases/components/candidate-case-table";
import styles from "@/app/(app)/dashboard/candidate-cases/page.module.css";
import { SectionCard } from "@/components/ui/section-card";
import { requireRole } from "@/lib/auth/session";
import {
  getCandidateCaseAssignmentOptions,
  listCandidateCases,
} from "@/lib/candidate-cases/queries";

export default async function CandidateCasesPage() {
  await requireRole(UserRole.ADMIN, UserRole.RECRUITER);

  const [candidateCases, assignmentOptions] = await Promise.all([
    listCandidateCases(),
    getCandidateCaseAssignmentOptions(),
  ]);

  return (
    <div className={styles.grid}>
      <SectionCard
        className={styles.formCard}
        title="Assign a candidate case"
        description="Generate a private working repository from the selected template and grant the candidate direct write access in one flow."
        eyebrow="Case operations"
      >
        <CandidateCaseCreateForm assignmentOptions={assignmentOptions} />
      </SectionCard>

      <SectionCard
        className={styles.tableCard}
        title="Assigned candidate cases"
        description="Each assignment is tracked locally and backed by a generated Gitea repository for hands-on evaluation."
        eyebrow="Current workload"
      >
        <CandidateCaseTable candidateCases={candidateCases} />
      </SectionCard>
    </div>
  );
}
