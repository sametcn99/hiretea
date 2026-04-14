import { Box, Flex, Grid, Heading, Separator, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { AppNavigation } from "@/app/(app)/components/app-navigation";
import { MobileNav } from "@/app/(app)/components/mobile-nav";
import { AppLogo } from "@/components/ui/app-logo";
import { requireAuthSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireAuthSession();
  const user = session.user;

  return (
    <>
      <Grid
        columns={{ initial: "1fr", md: "280px minmax(0, 1fr)" }}
        style={{ minHeight: "100vh" }}
      >
        <Flex
          direction="column"
          gap="5"
          p="5"
          display={{ initial: "none", md: "flex" }}
          style={{
            borderRight: "1px solid var(--gray-6)",
            background: "#16191d",
            position: "sticky",
            top: 0,
            height: "100vh",
            overflowY: "auto",
          }}
        >
          <AppLogo subtitle="Operations workspace" />
          <AppNavigation role={user.role} user={user} />
        </Flex>

        <Flex direction="column" display={{ initial: "flex", md: "none" }}>
          <MobileNav role={user.role} user={user} />
          <Separator size="4" />
        </Flex>

        <Flex
          direction="column"
          gap="5"
          p="5"
          asChild
          style={{ minWidth: 0, width: "100%" }}
        >
          <main>
            <Flex justify="between" gap="4" align="start" wrap="wrap">
              <Box>
                <Text
                  size="1"
                  weight="bold"
                  color="blue"
                  style={{
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                  }}
                >
                  Workspace
                </Text>
                <Heading as="h1" size="7" mt="1">
                  Dashboard
                </Heading>
              </Box>
            </Flex>
            {children}
          </main>
        </Flex>
      </Grid>
    </>
  );
}
