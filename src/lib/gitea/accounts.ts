import { createAuditLog } from "@/lib/audit/log";
import { getGiteaAdminClient } from "@/lib/gitea/client";

type CreateCandidateAccountInput = {
  actorId: string;
  username: string;
  email: string;
  displayName: string;
  temporaryPassword: string;
  mustChangePassword?: boolean;
};

type GiteaUserResponse = {
  id: number;
  login: string;
  email?: string | null;
};

export async function createCandidateAccount(
  input: CreateCandidateAccountInput,
) {
  const client = getGiteaAdminClient();

  const user = await client.request<GiteaUserResponse>("/admin/users", {
    method: "POST",
    body: JSON.stringify({
      username: input.username,
      email: input.email,
      full_name: input.displayName,
      password: input.temporaryPassword,
      must_change_password: input.mustChangePassword ?? true,
      send_notify: false,
      visibility: "private",
    }),
  });

  await createAuditLog({
    action: "candidate.account.created",
    actorId: input.actorId,
    resourceType: "GiteaUser",
    resourceId: String(user.id),
    detail: {
      username: input.username,
      email: input.email,
    },
  });

  return user;
}

type DeleteCandidateAccountInput = {
  actorId?: string;
  username: string;
  reason?: string;
};

export async function deleteCandidateAccount(
  input: DeleteCandidateAccountInput,
) {
  const client = getGiteaAdminClient();

  await client.request<void>(`/admin/users/${input.username}`, {
    method: "DELETE",
  });

  await createAuditLog({
    action: input.reason ?? "candidate.account.deleted",
    actorId: input.actorId,
    resourceType: "GiteaUser",
    resourceId: input.username,
    detail: {
      username: input.username,
    },
  });
}
