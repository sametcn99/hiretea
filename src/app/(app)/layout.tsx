import { Box, Card, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { AppNavigation } from "@/app/(app)/components/app-navigation";
import { AppLogo } from "@/components/ui/app-logo";
import { requireAuthSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireAuthSession();

  return (
    <Grid
      columns={{ initial: "1fr", md: "280px minmax(0, 1fr)" }}
      style={{ minHeight: "100vh" }}
    >
      <Flex
        direction="column"
        gap="5"
        p="5"
        style={{
          borderRight: "1px solid var(--gray-6)",
          background: "#16191d",
        }}
      >
        <AppLogo subtitle="Operations workspace" />
        <AppNavigation role={session.user.role} />
      </Flex>
      <Flex direction="column" gap="5" p="5" asChild>
        <main>
          <Flex justify="between" gap="4" align="start" wrap="wrap">
            <Box>
              <Text
                size="1"
                weight="bold"
                color="blue"
                style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}
              >
                Workspace
              </Text>
              <Heading as="h1" size="7" mt="1">
                Dashboard
              </Heading>
            </Box>
            <Card size="1">
              <Flex direction="column" gap="1" align="end">
                <Text weight="bold">
                  {session.user.name ?? session.user.email}
                </Text>
                <Text size="1" color="gray">
                  {session.user.role.toLowerCase()}
                </Text>
              </Flex>
            </Card>
          </Flex>
          {children}
        </main>
      </Flex>
    </Grid>
  );
}
