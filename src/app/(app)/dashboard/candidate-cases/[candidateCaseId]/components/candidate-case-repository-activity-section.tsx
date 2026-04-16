import {
  Box,
  Callout,
  Code,
  Flex,
  Grid,
  Link as RadixLink,
  Separator,
  Text,
} from "@radix-ui/themes";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CandidateCaseDetail } from "@/lib/candidate-cases/queries";
import { formatCandidateCaseDate } from "./candidate-case-detail-helpers";

type CandidateCaseRepositoryActivitySectionProps = {
  candidateCase: CandidateCaseDetail;
};

export function CandidateCaseRepositoryActivitySection({
  candidateCase,
}: CandidateCaseRepositoryActivitySectionProps) {
  return (
    <SectionCard
      title="Repository activity"
      description="Recent commit, pull request, and webhook signals from the generated candidate repository."
      eyebrow="Workstream"
    >
      <Flex direction="column" gap="4">
        <Flex wrap="wrap" gap="3">
          <Text size="2" color="gray">
            Repository: {candidateCase.workingRepository ?? "Pending"}
          </Text>
          <Text size="2" color="gray">
            Branch:{" "}
            {candidateCase.branchName ?? candidateCase.templateDefaultBranch}
          </Text>
          <Text size="2" color="gray">
            Started: {formatCandidateCaseDate(candidateCase.startedAt)}
          </Text>
          <Text size="2" color="gray">
            Submitted: {formatCandidateCaseDate(candidateCase.submittedAt)}
          </Text>
          <Text size="2" color="gray">
            Last sync: {formatCandidateCaseDate(candidateCase.lastSyncedAt)}
          </Text>
        </Flex>

        {!candidateCase.workingRepository ? (
          <Text as="p" size="2" color="gray">
            Repository activity will appear here after the candidate repository
            is provisioned.
          </Text>
        ) : (
          <>
            {candidateCase.repositoryActivity.error ? (
              <Callout.Root color="amber" size="1">
                <Callout.Text>
                  Repository activity is partially unavailable:{" "}
                  {candidateCase.repositoryActivity.error}
                </Callout.Text>
              </Callout.Root>
            ) : null}

            <Grid columns={{ initial: "1fr", lg: "1fr 1fr" }} gap="4">
              <Flex direction="column" gap="3">
                <Text weight="bold">Recent commits</Text>
                {candidateCase.repositoryActivity.commits.length === 0 ? (
                  <Text size="2" color="gray">
                    No commit activity has been observed yet.
                  </Text>
                ) : (
                  candidateCase.repositoryActivity.commits.map(
                    (commit, index) => (
                      <Flex direction="column" gap="1" key={commit.sha}>
                        {index > 0 ? <Separator size="4" /> : null}
                        <Flex
                          justify="between"
                          align={{ initial: "start", sm: "center" }}
                          gap="2"
                          wrap="wrap"
                        >
                          {commit.url ? (
                            <RadixLink
                              href={commit.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {commit.message}
                            </RadixLink>
                          ) : (
                            <Text weight="medium">{commit.message}</Text>
                          )}
                          <Code size="1">{commit.sha.slice(0, 7)}</Code>
                        </Flex>
                        <Text size="1" color="gray">
                          {commit.authorName ??
                            commit.authorLogin ??
                            "Unknown author"}{" "}
                          · {formatCandidateCaseDate(commit.authoredAt)}
                        </Text>
                      </Flex>
                    ),
                  )
                )}
              </Flex>

              <Flex direction="column" gap="3">
                <Text weight="bold">Pull requests</Text>
                {candidateCase.repositoryActivity.pullRequests.length === 0 ? (
                  <Text size="2" color="gray">
                    No pull request activity has been observed yet.
                  </Text>
                ) : (
                  candidateCase.repositoryActivity.pullRequests.map(
                    (pullRequest, index) => (
                      <Flex direction="column" gap="1" key={pullRequest.number}>
                        {index > 0 ? <Separator size="4" /> : null}
                        <Flex
                          justify="between"
                          align={{ initial: "start", sm: "center" }}
                          gap="2"
                          wrap="wrap"
                        >
                          {pullRequest.url ? (
                            <RadixLink
                              href={pullRequest.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              #{pullRequest.number} {pullRequest.title}
                            </RadixLink>
                          ) : (
                            <Text weight="medium">
                              #{pullRequest.number} {pullRequest.title}
                            </Text>
                          )}
                          <StatusBadge
                            label={
                              pullRequest.isDraft
                                ? `${pullRequest.state} draft`
                                : pullRequest.state
                            }
                            tone={
                              pullRequest.isMerged
                                ? "positive"
                                : pullRequest.state === "open"
                                  ? "info"
                                  : "neutral"
                            }
                          />
                        </Flex>
                        <Text size="1" color="gray">
                          {pullRequest.authorName ?? "Unknown author"} · Updated{" "}
                          {formatCandidateCaseDate(pullRequest.updatedAt)}
                        </Text>
                      </Flex>
                    ),
                  )
                )}
              </Flex>
            </Grid>

            <Separator size="4" />

            <Flex direction="column" gap="3">
              <Text weight="bold">Webhook deliveries</Text>
              {candidateCase.webhookDeliveries.length === 0 ? (
                <Text size="2" color="gray">
                  No webhook deliveries have been recorded for this repository
                  yet.
                </Text>
              ) : (
                <Grid columns={{ initial: "1fr", lg: "1fr 1fr" }} gap="3">
                  {candidateCase.webhookDeliveries.map((delivery) => (
                    <Box
                      key={delivery.id}
                      style={{
                        border: "1px solid var(--gray-a5)",
                        borderRadius: "var(--radius-3)",
                        padding: "0.9rem",
                      }}
                    >
                      <Flex direction="column" gap="1">
                        <Flex justify="between" gap="2" wrap="wrap">
                          <Text weight="bold">{delivery.eventName}</Text>
                          <StatusBadge
                            label={
                              delivery.statusCode
                                ? `HTTP ${delivery.statusCode}`
                                : "Pending"
                            }
                            tone={
                              delivery.errorMessage
                                ? "warning"
                                : delivery.statusCode &&
                                    delivery.statusCode >= 400
                                  ? "warning"
                                  : "info"
                            }
                          />
                        </Flex>
                        <Text size="1" color="gray">
                          Action: {delivery.action ?? "N/A"}
                        </Text>
                        <Text size="1" color="gray">
                          Branch: {delivery.branchName ?? "N/A"}
                        </Text>
                        <Text size="1" color="gray">
                          Processed:{" "}
                          {formatCandidateCaseDate(delivery.processedAt)}
                        </Text>
                        <Text size="1" color="gray">
                          Received:{" "}
                          {formatCandidateCaseDate(delivery.createdAt)}
                        </Text>
                        {delivery.errorMessage ? (
                          <Text size="1" color="red">
                            {delivery.errorMessage}
                          </Text>
                        ) : null}
                      </Flex>
                    </Box>
                  ))}
                </Grid>
              )}
            </Flex>
          </>
        )}
      </Flex>
    </SectionCard>
  );
}
