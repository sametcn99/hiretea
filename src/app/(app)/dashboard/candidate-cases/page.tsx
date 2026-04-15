import { UserRole } from "@prisma/client";
import { Grid } from "@radix-ui/themes";
import { CandidateCaseCreateForm } from "@/app/(app)/dashboard/candidate-cases/components/candidate-case-create-form";
import { CandidateCaseFilters } from "@/app/(app)/dashboard/candidate-cases/components/candidate-case-filters";
import { CandidateCaseTable } from "@/app/(app)/dashboard/candidate-cases/components/candidate-case-table";
import { SectionCard } from "@/components/ui/section-card";
import { requireRole } from "@/lib/auth/session";
import {
  getCandidateCaseAssignmentOptions,
  listCandidateCases,
} from "@/lib/candidate-cases/queries";

type CandidateCasesPageProps = {
  searchParams?: Promise<{
    archived?: string;
  }>;
};

export default async function CandidateCasesPage({
  searchParams,
}: CandidateCasesPageProps) {
  await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const showArchived = resolvedSearchParams?.archived === "1";

  const [candidateCases, assignmentOptions] = await Promise.all([
    listCandidateCases({ includeArchived: showArchived }),
    getCandidateCaseAssignmentOptions(),
  ]);

  return (
    <Grid
      columns={{ initial: "1fr", lg: "minmax(320px, 400px) minmax(0, 1fr)" }}
      gap="4"
      align="start"
    >
      <SectionCard
        style={{ position: "sticky", top: 28 }}
        title="Assign a candidate case"
        description="Generate a private working repository from the selected template and grant the candidate direct write access in one flow."
        eyebrow="Case operations"
      >
        <CandidateCaseCreateForm assignmentOptions={assignmentOptions} />
      </SectionCard>

      <SectionCard
        title="Assigned candidate cases"
        description={
          showArchived
            ? "Each assignment is tracked locally. Archived cases stay recoverable, and active cases remain ready for day-to-day operations."
            : "Each assignment is tracked locally and backed by a generated Gitea repository for hands-on evaluation."
        }
        eyebrow="Current workload"
      >
        <CandidateCaseFilters showArchived={showArchived} />
        <CandidateCaseTable
          candidateCases={candidateCases}
          showArchived={showArchived}
        />
      </SectionCard>
    </Grid>
  );
}
