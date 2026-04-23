import { UserRole } from "@prisma/client";
import { Button, Flex } from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
import { CaseTemplateCreateForm } from "@/app/(app)/dashboard/case-templates/components/case-template-create-form";
import { SectionCard } from "@/components/ui/section-card";
import { requireRole } from "@/lib/auth/session";
import {
  listCaseTemplateReviewerOptions,
  listCaseTemplateSourceRepositories,
} from "@/lib/case-templates/queries";

export default async function NewCaseTemplatePage() {
  await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const [reviewerOptions, sourceRepositories] = await Promise.all([
    listCaseTemplateReviewerOptions(),
    listCaseTemplateSourceRepositories(),
  ]);

  return (
    <SectionCard
      title="Create a case template"
      description="Select an existing Gitea repository, then either link it directly or create a dedicated template copy before saving the reusable review definition locally."
      eyebrow="Case operations"
    >
      <Flex justify="end" mb="4">
        <Button asChild variant="soft" color="gray" size="2">
          <Link href={"/dashboard/case-templates" as Route}>
            Back to case templates
          </Link>
        </Button>
      </Flex>
      <CaseTemplateCreateForm
        reviewerOptions={reviewerOptions}
        sourceRepositories={sourceRepositories}
        successRedirectPath="/dashboard/case-templates"
      />
    </SectionCard>
  );
}
