import { createAuditLog } from "@/lib/audit/log";
import { getWorkspaceSettingsOrThrow } from "@/lib/workspace-settings/queries";
import { getGiteaAdminClient } from "./client";

const recruiterTeamName = "hiretea-recruiters";

async function ensureRecruiterTeam() {
  const client = await getGiteaAdminClient();
  const settings = await getWorkspaceSettingsOrThrow();
  const teams = await client.listOrganizationTeams(settings.giteaOrganization);

  const existingTeam = teams.find((team) => team.name === recruiterTeamName);

  if (existingTeam) {
    return { organization: settings.giteaOrganization, team: existingTeam };
  }

  const createdTeam = await client.createOrganizationTeam(
    settings.giteaOrganization,
    {
      name: recruiterTeamName,
      description:
        "Hiretea internal recruiting team members with full organization repo access.",
      permission: "admin",
      can_create_org_repo: true,
      includes_all_repositories: true,
    },
  );

  return { organization: settings.giteaOrganization, team: createdTeam };
}

export async function ensureRecruiterTeamMembership(input: {
  actorId: string;
  username: string;
  audit?: boolean;
}) {
  const client = await getGiteaAdminClient();
  const { organization, team } = await ensureRecruiterTeam();

  await client.addTeamMember(team.id, input.username);

  if (input.audit === false) {
    return;
  }

  await createAuditLog({
    action: "recruiter.account.team-membership.synced",
    actorId: input.actorId,
    resourceType: "GiteaTeam",
    resourceId: String(team.id),
    detail: {
      organization,
      teamName: team.name,
      username: input.username,
    },
  });
}
