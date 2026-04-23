import { Box, Container, Flex, Text } from "@radix-ui/themes";
import {
  CandidateCaseCompletionPanel,
  type CandidateCompletionSignalView,
} from "@/app/(public)/invite/[token]/components/candidate-case-completion-panel";
import { InviteClaimPanel } from "@/app/(public)/invite/[token]/components/invite-claim-panel";
import { AppLogo } from "@/components/ui/app-logo";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CandidateCompletionSignal } from "@/lib/candidate-cases/candidate-completion";
import { getCandidateInvitePageData } from "@/lib/candidate-invites/queries";
import { getGiteaRuntimeConfig } from "@/lib/gitea/runtime-config";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

function serializeCompletionSignal(
  signal: CandidateCompletionSignal,
): CandidateCompletionSignalView {
  switch (signal.kind) {
    case "LOGIN_REQUIRED":
    case "OPEN":
      return signal;
    case "MARKED_REVERTIBLE":
      return {
        kind: "MARKED_REVERTIBLE",
        requestedAt: signal.requestedAt.toISOString(),
        source: signal.source,
      };
    case "LOCKED_BY_DEADLINE":
      return {
        kind: "LOCKED_BY_DEADLINE",
        requestedAt: signal.requestedAt?.toISOString() ?? null,
        lockedAt: signal.lockedAt.toISOString(),
        source: signal.source,
      };
    case "LOCKED_BY_REVIEW":
      return {
        kind: "LOCKED_BY_REVIEW",
        requestedAt: signal.requestedAt.toISOString(),
        source: signal.source,
        firstReviewNoteAt: signal.firstReviewNoteAt.toISOString(),
      };
  }
}

type InvitePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const [pageData, runtimeConfig] = await Promise.all([
    getCandidateInvitePageData(token),
    getGiteaRuntimeConfig(),
  ]);
  const invite = pageData?.landing ?? null;
  const cases = pageData?.cases ?? [];
  const giteaLoginUrl = runtimeConfig.publicBaseUrl
    ? `${runtimeConfig.publicBaseUrl.replace(/\/$/, "")}/user/login`
    : null;

  return (
    <Container size="2" py="7">
      <Flex direction="column" gap="5">
        <AppLogo subtitle="Candidate onboarding" />

        <SectionCard
          title={invite ? `Welcome, ${invite.displayName}` : "Invite not found"}
          description={
            invite
              ? "Use this onboarding link to securely receive your Gitea access details before the first repository login."
              : "The onboarding link is invalid or no longer available. Ask the hiring team to issue a new invite."
          }
          eyebrow="Gitea access"
        >
          {invite ? (
            <Flex direction="column" gap="3">
              <Flex gap="2" wrap="wrap">
                <StatusBadge
                  label={invite.status.toLowerCase()}
                  tone={
                    invite.status === "PENDING"
                      ? "info"
                      : invite.status === "CLAIMED"
                        ? "positive"
                        : invite.status === "EXPIRED"
                          ? "warning"
                          : "neutral"
                  }
                />
                <StatusBadge
                  label={invite.login ?? "Gitea login pending"}
                  tone="neutral"
                />
              </Flex>

              <Box>
                <Text size="2" color="gray">
                  Email: {invite.email}
                </Text>
                <Text size="2" color="gray">
                  Invite created: {dateFormatter.format(invite.createdAt)}
                </Text>
                <Text size="2" color="gray">
                  Invite expires: {dateFormatter.format(invite.expiresAt)}
                </Text>
              </Box>

              <InviteClaimPanel
                token={token}
                inviteStatus={invite.status}
                passwordAvailable={invite.passwordAvailable}
                giteaLoginUrl={giteaLoginUrl}
              />
            </Flex>
          ) : (
            <Text size="2" color="gray">
              Ask the hiring team for a fresh onboarding link, then retry from
              the new invite.
            </Text>
          )}
        </SectionCard>

        {invite && cases.length > 0 ? (
          <SectionCard
            title="Your cases"
            description="Mark a case complete once you are finished. Reviewers can only score cases after you mark them complete, and cases lock automatically at their deadline."
            eyebrow="Completion"
          >
            <Flex direction="column" gap="3">
              {cases.map((candidateCase) => (
                <CandidateCaseCompletionPanel
                  key={candidateCase.candidateCaseId}
                  token={token}
                  candidateCaseId={candidateCase.candidateCaseId}
                  templateName={candidateCase.templateName}
                  templateSlug={candidateCase.templateSlug}
                  status={candidateCase.status}
                  workingRepository={candidateCase.workingRepository}
                  workingRepositoryUrl={candidateCase.workingRepositoryUrl}
                  dueAt={candidateCase.dueAt?.toISOString() ?? null}
                  completion={serializeCompletionSignal(
                    candidateCase.completion,
                  )}
                />
              ))}
            </Flex>
          </SectionCard>
        ) : null}

        <SectionCard
          title="What happens next"
          description="This onboarding link only handles first-time access delivery. Candidates work directly in Gitea and do not sign in to the Hiretea dashboard."
          eyebrow="Flow"
        >
          <ol
            style={{
              margin: 0,
              paddingLeft: "1.1rem",
              display: "grid",
              gap: "0.7rem",
            }}
          >
            <li>
              <Text color="gray">
                Reveal your temporary Gitea credentials from this link.
              </Text>
            </li>
            <li>
              <Text color="gray">
                Continue to Gitea and sign in with those credentials.
              </Text>
            </li>
            <li>
              <Text color="gray">
                Change your password when Gitea prompts you on the first
                successful sign-in.
              </Text>
            </li>
          </ol>
        </SectionCard>
      </Flex>
    </Container>
  );
}
