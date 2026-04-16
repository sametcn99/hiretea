import { Box, Flex, Text } from "@radix-ui/themes";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CandidateCaseDetail } from "@/lib/candidate-cases/queries";
import { formatCandidateCaseDate } from "./candidate-case-detail-helpers";

type CandidateCaseContextSectionProps = {
  candidateCase: CandidateCaseDetail;
};

export function CandidateCaseContextSection({
  candidateCase,
}: CandidateCaseContextSectionProps) {
  return (
    <SectionCard
      title="Case context"
      description="Keep the full assignment context visible while you inspect repository and review activity."
      eyebrow="Summary"
    >
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Candidate
          </Text>
          <Text size="2">{candidateCase.candidateDisplayName}</Text>
          <Text size="1" color="gray">
            {candidateCase.candidateEmail}
          </Text>
          <Text size="1" color="gray">
            Gitea login: {candidateCase.candidateLogin ?? "Not linked"}
          </Text>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Assignment
          </Text>
          <Text size="1" color="gray">
            Created: {formatCandidateCaseDate(candidateCase.createdAt)}
          </Text>
          <Text size="1" color="gray">
            Due: {formatCandidateCaseDate(candidateCase.dueAt)}
          </Text>
          <Text size="1" color="gray">
            Reviewed: {formatCandidateCaseDate(candidateCase.reviewedAt)}
          </Text>
          <Text size="1" color="gray">
            Owner: {candidateCase.createdByName}
          </Text>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Reviewer assignment
          </Text>
          <Text size="1" color="gray">
            {candidateCase.reviewerDisplayNames.length > 0
              ? candidateCase.reviewerDisplayNames.join(", ")
              : "No reviewers assigned"}
          </Text>
          <Text size="1" color="gray">
            Notes recorded: {candidateCase.notesCount}
          </Text>
          <Text size="1" color="gray">
            Latest reviewer:{" "}
            {candidateCase.latestReviewerName ?? "Not reviewed"}
          </Text>
          <Text size="1" color="gray">
            Latest score:{" "}
            {typeof candidateCase.latestScore === "number"
              ? `${candidateCase.latestScore}/10`
              : "No score yet"}
          </Text>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Access grants
          </Text>
          {candidateCase.accessGrants.length === 0 ? (
            <Text size="1" color="gray">
              No access grants recorded yet.
            </Text>
          ) : (
            candidateCase.accessGrants.map((grant) => (
              <Box
                key={grant.id}
                style={{
                  border: "1px solid var(--gray-a5)",
                  borderRadius: "var(--radius-2)",
                  padding: "0.75rem",
                }}
              >
                <Flex direction="column" gap="1">
                  <Flex justify="between" gap="2" wrap="wrap">
                    <Text size="2" weight="medium">
                      {grant.permissionKey}
                    </Text>
                    <StatusBadge
                      label={grant.revokedAt ? "revoked" : "active"}
                      tone={grant.revokedAt ? "neutral" : "positive"}
                    />
                  </Flex>
                  <Text size="1" color="gray">
                    {grant.repositoryName}
                  </Text>
                  <Text size="1" color="gray">
                    Read {grant.canRead ? "yes" : "no"} · Write{" "}
                    {grant.canWrite ? "yes" : "no"} · PR{" "}
                    {grant.canOpenPullRequests ? "yes" : "no"} · Issues{" "}
                    {grant.canOpenIssues ? "yes" : "no"}
                  </Text>
                  <Text size="1" color="gray">
                    Granted: {formatCandidateCaseDate(grant.grantedAt)}
                  </Text>
                  <Text size="1" color="gray">
                    Revoked: {formatCandidateCaseDate(grant.revokedAt)}
                  </Text>
                </Flex>
              </Box>
            ))
          )}
        </Flex>
      </Flex>
    </SectionCard>
  );
}
