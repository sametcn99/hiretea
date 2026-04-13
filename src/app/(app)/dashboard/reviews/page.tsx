import { UserRole } from "@prisma/client";
import { ReviewCaseTable } from "@/app/(app)/dashboard/reviews/components/review-case-table";
import { ReviewNoteForm } from "@/app/(app)/dashboard/reviews/components/review-note-form";
import styles from "@/app/(app)/dashboard/reviews/page.module.css";
import { SectionCard } from "@/components/ui/section-card";
import { requireRole } from "@/lib/auth/session";
import { listReviewCases } from "@/lib/evaluation-notes/queries";

export default async function ReviewsPage() {
  await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const reviewCases = await listReviewCases();

  return (
    <div className={styles.grid}>
      <SectionCard
        className={styles.formCard}
        title="Record a review"
        description="Capture reviewer notes, score the submission, and optionally finalize the decision for a candidate case."
        eyebrow="Reviewer workflow"
      >
        <ReviewNoteForm reviewCases={reviewCases} />
      </SectionCard>

      <SectionCard
        className={styles.tableCard}
        title="Review board"
        description="Track the latest review signal, note count, and final decision across assigned candidate cases."
        eyebrow="Current reviews"
      >
        <ReviewCaseTable reviewCases={reviewCases} />
      </SectionCard>
    </div>
  );
}
