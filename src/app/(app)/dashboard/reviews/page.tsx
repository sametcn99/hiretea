import { UserRole } from "@prisma/client";
import { Grid } from "@radix-ui/themes";
import { ReviewCaseTable } from "@/app/(app)/dashboard/reviews/components/review-case-table";
import { ReviewNoteForm } from "@/app/(app)/dashboard/reviews/components/review-note-form";
import { SectionCard } from "@/components/ui/section-card";
import { requireRole } from "@/lib/auth/session";
import { listReviewCases } from "@/lib/evaluation-notes/queries";

export default async function ReviewsPage() {
  await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const reviewCases = await listReviewCases();

  return (
    <Grid
      columns={{ initial: "1fr", lg: "minmax(340px, 420px) minmax(0, 1fr)" }}
      gap="4"
      align="start"
    >
      <SectionCard
        style={{ position: "sticky", top: 28 }}
        title="Record a review"
        description="Capture reviewer notes, score the submission, and optionally finalize the decision for a candidate case while template-level review guides come online."
        eyebrow="Reviewer workflow"
      >
        <ReviewNoteForm reviewCases={reviewCases} />
      </SectionCard>

      <SectionCard
        title="Review board"
        description="Track the latest review signal, note count, final decision, and template-level rubric readiness across assigned candidate cases."
        eyebrow="Current reviews"
      >
        <ReviewCaseTable reviewCases={reviewCases} />
      </SectionCard>
    </Grid>
  );
}
