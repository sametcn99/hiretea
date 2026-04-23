import { UserRole } from "@prisma/client";
import { Button, Flex } from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";
import { requireRole } from "@/lib/auth/session";
import { RecruiterProvisionForm } from "../components/recruiter-provision-form";

export default async function NewTeamMemberPage() {
  await requireRole(UserRole.ADMIN);

  return (
    <SectionCard
      title="Provision a recruiting team member"
      description="Create the local recruiter record, the matching self-hosted Gitea account, and the organization team access in one action."
      eyebrow="Admin only"
    >
      <Flex justify="end" mb="4">
        <Button asChild variant="soft" color="gray" size="2">
          <Link href={"/dashboard/team" as Route}>Back to team</Link>
        </Button>
      </Flex>
      <RecruiterProvisionForm successRedirectPath="/dashboard/team" />
    </SectionCard>
  );
}
