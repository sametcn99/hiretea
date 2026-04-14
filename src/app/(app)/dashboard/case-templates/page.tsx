import { UserRole } from "@prisma/client";
import { Grid } from "@radix-ui/themes";
import { CaseTemplateCreateForm } from "@/app/(app)/dashboard/case-templates/components/case-template-create-form";
import { CaseTemplateTable } from "@/app/(app)/dashboard/case-templates/components/case-template-table";
import { SectionCard } from "@/components/ui/section-card";
import { requireRole } from "@/lib/auth/session";
import { listCaseTemplates } from "@/lib/case-templates/queries";

export default async function CaseTemplatesPage() {
  await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const templates = await listCaseTemplates();

  return (
    <Grid
      columns={{ initial: "1fr", lg: "minmax(320px, 420px) minmax(0, 1fr)" }}
      gap="4"
      align="start"
    >
      <SectionCard
        style={{ position: "sticky", top: 28 }}
        title="Create a case template"
        description="Provision the repository in Gitea and store the reusable evaluation definition locally."
        eyebrow="Case operations"
      >
        <CaseTemplateCreateForm />
      </SectionCard>

      <SectionCard
        title="Case template library"
        description="Templates are the reusable source of truth for engineering challenges. Future assignment flows will fan out from this list."
        eyebrow="Current templates"
      >
        <CaseTemplateTable templates={templates} />
      </SectionCard>
    </Grid>
  );
}
