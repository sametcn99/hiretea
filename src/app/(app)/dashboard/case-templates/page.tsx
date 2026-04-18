import { UserRole } from "@prisma/client";
import { Grid } from "@radix-ui/themes";
import { CaseTemplateCreateForm } from "@/app/(app)/dashboard/case-templates/components/case-template-create-form";
import { CaseTemplateTable } from "@/app/(app)/dashboard/case-templates/components/case-template-table";
import { SectionCard } from "@/components/ui/section-card";
import { requireRole } from "@/lib/auth/session";
import {
  listCaseTemplateReviewerOptions,
  listCaseTemplateSourceRepositories,
  listCaseTemplates,
} from "@/lib/case-templates/queries";
import { getWorkspaceSettings } from "@/lib/workspace-settings/queries";

export default async function CaseTemplatesPage() {
  await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const [templates, reviewerOptions, sourceRepositories, settings] =
    await Promise.all([
      listCaseTemplates(),
      listCaseTemplateReviewerOptions(),
      listCaseTemplateSourceRepositories(),
      getWorkspaceSettings(),
    ]);

  return (
    <Grid
      columns={{ initial: "1fr", lg: "minmax(320px, 420px) minmax(0, 1fr)" }}
      gap="4"
      align="start"
    >
      <SectionCard
        style={{ position: "sticky", top: 28 }}
        title="Create a case template"
        description="Select an existing Gitea repository, then either link it directly or create a dedicated template copy before saving the reusable review definition locally."
        eyebrow="Case operations"
      >
        <CaseTemplateCreateForm
          reviewerOptions={reviewerOptions}
          sourceRepositories={sourceRepositories}
        />
      </SectionCard>

      <SectionCard
        title="Case template library"
        description="Templates are the reusable source of truth for engineering challenges, reviewer guidance, and rubric structure."
        eyebrow="Current templates"
      >
        <CaseTemplateTable
          templates={templates}
          reviewerOptions={reviewerOptions}
          workspaceBaseUrl={settings?.giteaBaseUrl ?? null}
        />
      </SectionCard>
    </Grid>
  );
}
