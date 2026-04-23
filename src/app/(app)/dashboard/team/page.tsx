import { UserRole } from "@prisma/client";
import { Button, Flex, Grid } from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";
import { requireRole } from "@/lib/auth/session";
import { listRecruiters } from "@/lib/recruiters/queries";
import { RecruiterTable } from "./components/recruiter-table";

export default async function TeamPage() {
  await requireRole(UserRole.ADMIN);
  const recruiters = await listRecruiters();

  return (
    <Grid columns={{ initial: "1fr" }} gap="4">
      <SectionCard
        title="Recruiting team roster"
        description="Admins manage onboarding history here. Recruiters can use the dashboard after sign-in but cannot access this user management surface."
        eyebrow="Workspace members"
      >
        <Flex justify="end" mb="4">
          <Button asChild size="2">
            <Link href={"/dashboard/team/new" as Route}>
              New recruiting team member
            </Link>
          </Button>
        </Flex>
        <RecruiterTable recruiters={recruiters} />
      </SectionCard>
    </Grid>
  );
}
