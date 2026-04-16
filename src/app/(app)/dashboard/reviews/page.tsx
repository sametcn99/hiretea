import { UserRole } from "@prisma/client";
import { Grid } from "@radix-ui/themes";
import { ReviewCaseTable } from "@/app/(app)/dashboard/reviews/components/review-case-table";
import { SectionCard } from "@/components/ui/section-card";
import { requireRole } from "@/lib/auth/session";
import { listReviewCases } from "@/lib/evaluation-notes/queries";

export default async function ReviewsPage() {
  const session = await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const reviewCases = await listReviewCases({
    actorId: session.user.id,
    actorRole: session.user.role,
  });

  return (
    <Grid columns={{ initial: "1fr" }} gap="4" align="start">
      <SectionCard
        title="Review board"
        description="Track the latest review signal, note count, final decision, and template-level rubric readiness across assigned candidate cases. Open a row to continue the dedicated reviewer workflow for that case."
        eyebrow="Current reviews"
      >
        <ReviewCaseTable reviewCases={reviewCases} />
      </SectionCard>
    </Grid>
  );
}
