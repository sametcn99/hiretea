import { UserRole } from "@prisma/client";
import { Button, Flex, Grid } from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
import { CandidateTable } from "@/app/(app)/dashboard/candidates/components/candidate-table";
import { SectionCard } from "@/components/ui/section-card";
import { requireRole } from "@/lib/auth/session";
import { listCandidates } from "@/lib/candidates/queries";

export default async function CandidatesPage() {
  await requireRole(UserRole.ADMIN, UserRole.RECRUITER);
  const candidates = await listCandidates();

  return (
    <Grid columns={{ initial: "1fr" }} gap="4">
      <SectionCard
        title="Provisioned candidates"
        description="This list is backed by local application data, including invite resend history, so the app stays authoritative about the hiring workflow."
        eyebrow="Current roster"
      >
        <Flex justify="end" mb="4">
          <Button asChild size="2">
            <Link href={"/dashboard/candidates/new" as Route}>
              New candidate
            </Link>
          </Button>
        </Flex>
        <CandidateTable candidates={candidates} />
      </SectionCard>
    </Grid>
  );
}
