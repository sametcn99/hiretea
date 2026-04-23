import { UserRole } from "@prisma/client";
import { Button, Flex, Grid } from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
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
    <Grid columns={{ initial: "1fr" }} gap="4">
      <SectionCard
        title="Assigned candidate cases"
        description={
          showArchived
            ? "Each assignment is tracked locally. Archived cases stay recoverable, and active cases remain ready for day-to-day operations."
            : "Each assignment is tracked locally and backed by a generated Gitea repository for hands-on evaluation."
        }
        eyebrow="Current workload"
      >
        <Flex justify="between" align="center" gap="3" mb="4" wrap="wrap">
          <CandidateCaseFilters showArchived={showArchived} />
          <Button asChild size="2">
            <Link href={"/dashboard/candidate-cases/new" as Route}>
              New candidate case
            </Link>
          </Button>
        </Flex>
        <CandidateCaseTable
          candidateCases={candidateCases}
          assignmentOptions={assignmentOptions}
          showArchived={showArchived}
        />
      </SectionCard>
    </Grid>
  );
}
