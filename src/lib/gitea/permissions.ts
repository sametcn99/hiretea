import { createAuditLog } from "@/lib/audit/log";
import { getGiteaAdminClient } from "@/lib/gitea/client";

type RepositoryPermission = "read" | "write" | "admin";

type GrantRepositoryAccessInput = {
  actorId: string;
  owner: string;
  repositoryName: string;
  username: string;
  permission: RepositoryPermission;
};

type RevokeRepositoryAccessInput = Omit<
  GrantRepositoryAccessInput,
  "permission"
>;

export async function grantRepositoryAccess(input: GrantRepositoryAccessInput) {
  const client = await getGiteaAdminClient();

  await client.request<void>(
    `/repos/${input.owner}/${input.repositoryName}/collaborators/${input.username}`,
    {
      method: "PUT",
      body: JSON.stringify({
        permission: input.permission,
      }),
    },
  );

  await createAuditLog({
    action: "candidate.access.granted",
    actorId: input.actorId,
    resourceType: "RepositoryPermission",
    resourceId: `${input.owner}/${input.repositoryName}`,
    detail: {
      username: input.username,
      permission: input.permission,
    },
  });
}

export async function revokeRepositoryAccess(
  input: RevokeRepositoryAccessInput,
) {
  const client = await getGiteaAdminClient();

  await client.request<void>(
    `/repos/${input.owner}/${input.repositoryName}/collaborators/${input.username}`,
    {
      method: "DELETE",
    },
  );

  await createAuditLog({
    action: "candidate.access.revoked",
    actorId: input.actorId,
    resourceType: "RepositoryPermission",
    resourceId: `${input.owner}/${input.repositoryName}`,
    detail: {
      username: input.username,
    },
  });
}
