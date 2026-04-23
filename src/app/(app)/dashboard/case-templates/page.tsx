import { UserRole } from "@prisma/client";
import { Button, Flex, Grid } from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
import { CaseTemplateTable } from "@/app/(app)/dashboard/case-templates/components/case-template-table";
import { SectionCard } from "@/components/ui/section-card";
import { requireRole } from "@/lib/auth/session";
import {
  listCaseTemplateReviewerOptions,
  listCaseTemplates,
} from "@/lib/case-templates/queries";
import { getWorkspaceSettings } from "@/lib/workspace-settings/queries";

export default async function CaseTemplatesPage() {
  await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const [templates, reviewerOptions, settings] = await Promise.all([
    listCaseTemplates(),
    listCaseTemplateReviewerOptions(),
    getWorkspaceSettings(),
  ]);

  return (
    <Grid columns={{ initial: "1fr" }} gap="4">
      <SectionCard
        title="Case template library"
        description="Templates are the reusable source of truth for engineering challenges, reviewer guidance, and rubric structure."
        eyebrow="Current templates"
      >
        <Flex justify="end" mb="4">
          <Button asChild size="2">
            <Link href={"/dashboard/case-templates/new" as Route}>
              New case template
            </Link>
          </Button>
        </Flex>
        <CaseTemplateTable
          templates={templates}
          reviewerOptions={reviewerOptions}
          workspaceBaseUrl={settings?.giteaBaseUrl ?? null}
        />
      </SectionCard>
    </Grid>
  );
}
