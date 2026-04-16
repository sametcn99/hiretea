import { UserRole } from "@prisma/client";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import {
  Button,
  Flex,
  Grid,
  Link as RadixLink,
  Separator,
  Text,
} from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewNoteForm } from "@/app/(app)/dashboard/reviews/components/review-note-form";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRole } from "@/lib/auth/session";
import {
  getReviewCaseById,
  listReviewCases,
} from "@/lib/evaluation-notes/queries";

type ReviewWorkflowPageProps = {
  params: Promise<{
    candidateCaseId: string;
  }>;
};

const statusToneMap = {
  DRAFT: "neutral",
  PROVISIONING: "info",
  READY: "positive",
  IN_PROGRESS: "info",
  REVIEWING: "warning",
  COMPLETED: "positive",
  ARCHIVED: "neutral",
} as const;

const decisionToneMap = {
  ADVANCE: "positive",
  HOLD: "neutral",
  REJECT: "warning",
} as const;

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function ReviewWorkflowPage({
  params,
}: ReviewWorkflowPageProps) {
  const session = await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const { candidateCaseId } = await params;

  const [reviewCase, reviewCases] = await Promise.all([
    getReviewCaseById({
      candidateCaseId,
      actorId: session.user.id,
      actorRole: session.user.role,
    }),
    listReviewCases({
      actorId: session.user.id,
      actorRole: session.user.role,
    }),
  ]);

  if (!reviewCase) {
    notFound();
  }

  const currentIndex = reviewCases.findIndex(
    (item) => item.id === reviewCase.id,
  );
  const previousReviewCase =
    currentIndex > 0 ? reviewCases[currentIndex - 1] : null;
  const nextReviewCase =
    currentIndex >= 0 && currentIndex < reviewCases.length - 1
      ? reviewCases[currentIndex + 1]
      : null;
  const currentPosition = currentIndex >= 0 ? currentIndex + 1 : null;

  return (
    <Grid
      columns={{ initial: "1fr", xl: "minmax(0, 1fr) 360px" }}
      gap="4"
      align="start"
    >
      <Flex direction="column" gap="4">
        <SectionCard
          title="Reviewer workflow"
          description="Capture the review note, score, and final decision for the selected candidate case."
          eyebrow="Case review"
        >
          <Flex direction="column" gap="4">
            <Flex justify="between" align="center" wrap="wrap" gap="3">
              <Flex gap="2" wrap="wrap">
                <Button asChild variant="soft" color="gray" size="2">
                  <Link href={"/dashboard/reviews" as Route}>
                    <ArrowLeftIcon />
                    Back to review board
                  </Link>
                </Button>
                {previousReviewCase ? (
                  <Button asChild variant="soft" size="2">
                    <Link
                      href={
                        `/dashboard/reviews/${previousReviewCase.id}` as Route
                      }
                    >
                      Previous case
                    </Link>
                  </Button>
                ) : (
                  <Button variant="soft" size="2" disabled>
                    Previous case
                  </Button>
                )}
                {nextReviewCase ? (
                  <Button asChild variant="soft" size="2">
                    <Link
                      href={`/dashboard/reviews/${nextReviewCase.id}` as Route}
                    >
                      Next case
                    </Link>
                  </Button>
                ) : (
                  <Button variant="soft" size="2" disabled>
                    Next case
                  </Button>
                )}
              </Flex>
              <Flex gap="2" wrap="wrap" align="center">
                {currentPosition ? (
                  <Text size="1" color="gray">
                    Case {currentPosition} of {reviewCases.length}
                  </Text>
                ) : null}
                <StatusBadge
                  label={reviewCase.status.toLowerCase().replace(/_/g, " ")}
                  tone={statusToneMap[reviewCase.status]}
                />
                {reviewCase.decision ? (
                  <StatusBadge
                    label={reviewCase.decision.toLowerCase()}
                    tone={decisionToneMap[reviewCase.decision]}
                  />
                ) : null}
              </Flex>
            </Flex>

            <Flex direction="column" gap="1">
              <Text weight="bold" size="4">
                {reviewCase.candidateDisplayName}
              </Text>
              <Text size="2" color="gray">
                {reviewCase.templateName} · {reviewCase.templateSlug}
              </Text>
              <Text size="1" color="gray">
                {reviewCase.candidateEmail}
              </Text>
            </Flex>

            <ReviewNoteForm fixedReviewCase={reviewCase} />
          </Flex>
        </SectionCard>

        <SectionCard
          title="Review history"
          description="See every recorded review note for this case while continuing the workflow."
          eyebrow="Past reviews"
        >
          {reviewCase.reviewHistory.length === 0 ? (
            <Text as="p" size="2" color="gray">
              No review notes have been recorded for this case yet.
            </Text>
          ) : (
            <Flex direction="column" gap="3">
              {reviewCase.reviewHistory.map((historyItem, index) => (
                <Flex direction="column" gap="2" key={historyItem.id}>
                  {index > 0 ? <Separator size="4" /> : null}
                  <Flex
                    justify="between"
                    align={{ initial: "start", sm: "center" }}
                    gap="3"
                    wrap="wrap"
                  >
                    <Flex direction="column" gap="1">
                      <Text size="2" weight="bold">
                        {historyItem.authorName}
                      </Text>
                      <Text size="1" color="gray">
                        Created: {dateFormatter.format(historyItem.createdAt)}
                      </Text>
                      <Text size="1" color="gray">
                        Updated: {dateFormatter.format(historyItem.updatedAt)}
                      </Text>
                    </Flex>
                    <Text size="2" weight="medium">
                      {typeof historyItem.score === "number"
                        ? `Score ${historyItem.score}/10`
                        : "No score"}
                    </Text>
                  </Flex>
                  <Text size="2" weight="medium">
                    {historyItem.summary}
                  </Text>
                  <Text size="1" color="gray">
                    {historyItem.note ?? "No detailed note provided."}
                  </Text>
                </Flex>
              ))}
            </Flex>
          )}
        </SectionCard>
      </Flex>

      <SectionCard
        title="Case context"
        description="Keep the current candidate case details visible while you review the implementation."
        eyebrow="Selected case"
      >
        <Flex direction="column" gap="3">
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">
              Repository
            </Text>
            {reviewCase.workingRepositoryUrl ? (
              <RadixLink
                href={reviewCase.workingRepositoryUrl}
                target="_blank"
                rel="noreferrer"
              >
                {reviewCase.workingRepository ?? "Open repository"}
              </RadixLink>
            ) : (
              <Text size="2">{reviewCase.workingRepository ?? "Pending"}</Text>
            )}
            <Text size="1" color="gray">
              Candidate login: {reviewCase.candidateLogin ?? "Not linked"}
            </Text>
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">
              Reviewer assignment
            </Text>
            <Text size="1" color="gray">
              {reviewCase.assignedReviewerNames.length > 0
                ? reviewCase.assignedReviewerNames.join(", ")
                : "No explicit reviewers assigned"}
            </Text>
            <Text size="1" color="gray">
              {reviewCase.hasTemplateReviewGuide
                ? reviewCase.rubricCriteriaCount > 0
                  ? `${reviewCase.rubricCriteriaCount} rubric criteria ready`
                  : "Template review guide ready"
                : "No template review guide yet"}
            </Text>
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">
              Review status
            </Text>
            <Text size="1" color="gray">
              Notes recorded: {reviewCase.notesCount}
            </Text>
            <Text size="1" color="gray">
              Latest reviewer: {reviewCase.latestReviewerName ?? "Not reviewed"}
            </Text>
            <Text size="1" color="gray">
              Latest score:{" "}
              {typeof reviewCase.latestScore === "number"
                ? `${reviewCase.latestScore}/10`
                : "No score yet"}
            </Text>
            <Text size="1" color="gray">
              Latest review:{" "}
              {reviewCase.latestReviewedAt
                ? dateFormatter.format(reviewCase.latestReviewedAt)
                : "No notes yet"}
            </Text>
            <Text size="1" color="gray">
              Due:{" "}
              {reviewCase.dueAt
                ? dateFormatter.format(reviewCase.dueAt)
                : "No due date"}
            </Text>
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">
              Latest summary
            </Text>
            <Text size="1" color="gray">
              {reviewCase.latestSummary ?? "No review summary recorded yet."}
            </Text>
          </Flex>
        </Flex>
      </SectionCard>
    </Grid>
  );
}
