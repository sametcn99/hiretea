import { UserRole } from "@prisma/client";
import { Button, Flex } from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
import { CandidateCaseCreateForm } from "@/app/(app)/dashboard/candidate-cases/components/candidate-case-create-form";
import { SectionCard } from "@/components/ui/section-card";
import { requireRole } from "@/lib/auth/session";
import { getCandidateCaseAssignmentOptions } from "@/lib/candidate-cases/queries";

export default async function NewCandidateCasePage() {
  await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const assignmentOptions = await getCandidateCaseAssignmentOptions();

  return (
    <SectionCard
      title="Assign a candidate case"
      description="Generate a private working repository from the selected template and grant the candidate direct write access in one flow."
      eyebrow="Case operations"
    >
      <Flex justify="end" mb="4">
        <Button asChild variant="soft" color="gray" size="2">
          <Link href={"/dashboard/candidate-cases" as Route}>
            Back to candidate cases
          </Link>
        </Button>
      </Flex>
      <CandidateCaseCreateForm
        assignmentOptions={assignmentOptions}
        successRedirectPath="/dashboard/candidate-cases"
      />
    </SectionCard>
  );
}
