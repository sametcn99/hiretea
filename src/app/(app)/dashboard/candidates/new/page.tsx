import { UserRole } from "@prisma/client";
import { Button, Flex } from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
import { CandidateProvisionForm } from "@/app/(app)/dashboard/candidates/components/candidate-provision-form";
import { SectionCard } from "@/components/ui/section-card";
import { requireRole } from "@/lib/auth/session";

export default async function NewCandidatePage() {
  await requireRole(UserRole.ADMIN, UserRole.RECRUITER);

  return (
    <SectionCard
      title="Provision a candidate"
      description="Create the local candidate record and the matching self-hosted Gitea account in one action."
      eyebrow="Candidate operations"
    >
      <Flex justify="end" mb="4">
        <Button asChild variant="soft" color="gray" size="2">
          <Link href={"/dashboard/candidates" as Route}>
            Back to candidates
          </Link>
        </Button>
      </Flex>
      <CandidateProvisionForm successRedirectPath="/dashboard/candidates" />
    </SectionCard>
  );
}
