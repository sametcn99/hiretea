import { UserRole } from "@prisma/client";
import { CandidateCaseWorkspace } from "@/app/(app)/dashboard/my-cases/components/candidate-case-workspace";
import { requireRole } from "@/lib/auth/session";
import { listCandidateWorkspaceCases } from "@/lib/candidate-cases/queries";

export default async function MyCasesPage() {
  const session = await requireRole(UserRole.CANDIDATE);
  const candidateCases = await listCandidateWorkspaceCases(session.user.id);

  return <CandidateCaseWorkspace candidateCases={candidateCases} />;
}
