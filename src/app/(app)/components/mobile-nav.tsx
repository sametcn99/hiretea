"use client";

import type { UserRole } from "@prisma/client";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { Box, Dialog, Flex, IconButton } from "@radix-ui/themes";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLogo } from "@/components/ui/app-logo";
import { AppNavigation } from "./app-navigation";

type MobileNavProps = {
  role: UserRole;
  user: { name?: string | null; email?: string | null; role: UserRole };
};

export function MobileNav({ role, user }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu when the route changes
  useEffect(() => {
    if (pathname) {
      setOpen(false);
    }
  }, [pathname]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Flex
        justify="between"
        align="center"
        p="4"
        style={{
          borderBottom: "1px solid var(--gray-6)",
          background: "#16191d", // Matching dark theme for top bar
        }}
      >
        <AppLogo subtitle="Operations workspace" />
        <Dialog.Trigger>
          <IconButton variant="soft" color="gray" size="3" aria-label="Menu">
            <HamburgerMenuIcon width="20" height="20" />
          </IconButton>
        </Dialog.Trigger>
      </Flex>

      <Dialog.Content
        size="4"
        style={{
          maxWidth: 400,
          width: "90vw",
          height: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Dialog.Title style={{ display: "none" }}>Menu</Dialog.Title>
        <Dialog.Description style={{ display: "none" }}>
          Primary navigation menu
        </Dialog.Description>

        <Box
          style={{
            flex: 1,
            overflowY: "auto",
            marginTop: "-10px",
            padding: "10px 0",
          }}
        >
          <AppNavigation role={role} user={user} />
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  );
}
