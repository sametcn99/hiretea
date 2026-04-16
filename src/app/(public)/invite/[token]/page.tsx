import { Box, Container, Flex, Text } from "@radix-ui/themes";
import { InviteClaimPanel } from "@/app/(public)/invite/[token]/components/invite-claim-panel";
import { AppLogo } from "@/components/ui/app-logo";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCandidateInviteLanding } from "@/lib/candidate-invites/claim-candidate-invite";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

type InvitePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const invite = await getCandidateInviteLanding(token);

  return (
    <Container size="2" py="7">
      <Flex direction="column" gap="5">
        <AppLogo subtitle="Candidate onboarding" />

        <SectionCard
          title={invite ? `Welcome, ${invite.displayName}` : "Invite not found"}
          description={
            invite
              ? "Use this onboarding link to securely receive your Gitea access details before the first sign-in."
              : "The onboarding link is invalid or no longer available. Ask the hiring team to issue a new invite."
          }
          eyebrow="Hiretea access"
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
              />
            </Flex>
          ) : (
            <Text size="2" color="gray">
              Ask the hiring team for a fresh onboarding link, then retry from
              the new invite.
            </Text>
          )}
        </SectionCard>

        <SectionCard
          title="What happens next"
          description="This onboarding link only handles first-time access delivery. Authentication still happens through your Gitea identity."
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
                Continue to the sign-in page and authenticate through Gitea.
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
