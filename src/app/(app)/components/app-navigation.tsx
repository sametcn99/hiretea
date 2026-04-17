"use client";

import type { UserRole } from "@prisma/client";
import {
  ActivityLogIcon,
  Component1Icon,
  DashboardIcon,
  ExitIcon,
  GearIcon,
  MagnifyingGlassIcon,
  PersonIcon,
  TokensIcon,
} from "@radix-ui/react-icons";
import { Avatar, Box, Flex, IconButton, Text } from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type AppNavigationProps = {
  role: UserRole;
  user: { name?: string | null; email?: string | null; role: UserRole };
};

type NavigationItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const baseItems: NavigationItem[] = [
  { href: "/dashboard", label: "Overview", icon: <DashboardIcon /> },
];

const managementItems: NavigationItem[] = [
  { href: "/dashboard/candidates", label: "Candidates", icon: <PersonIcon /> },
  {
    href: "/dashboard/case-templates",
    label: "Case templates",
    icon: <TokensIcon />,
  },
  {
    href: "/dashboard/candidate-cases",
    label: "Candidate cases",
    icon: <Component1Icon />,
  },
  {
    href: "/dashboard/reviews",
    label: "Reviews",
    icon: <MagnifyingGlassIcon />,
  },
  {
    href: "/dashboard/audit-trail",
    label: "Audit trail",
    icon: <ActivityLogIcon />,
  },
];

const adminItems: NavigationItem[] = [
  { href: "/dashboard/team", label: "Recruiting team", icon: <PersonIcon /> },
  { href: "/dashboard/settings", label: "Settings", icon: <GearIcon /> },
];

export function AppNavigation({ role, user }: AppNavigationProps) {
  const pathname = usePathname();

  function isItemActive(href: string) {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const getNavSections = () => {
    const sections = [
      { title: "Main", items: baseItems },
      { title: "Management", items: managementItems },
    ];

    if (role === "ADMIN") {
      sections.push({ title: "Administration", items: adminItems });
    }

    return sections;
  };

  return (
    <Flex direction="column" gap="4" style={{ height: "100%" }}>
      <Flex direction="column" gap="4" asChild style={{ flex: 1 }}>
        <nav aria-label="Primary navigation">
          {getNavSections().map((section) => (
            <Flex direction="column" gap="2" key={section.title}>
              <Text
                size="1"
                weight="medium"
                color="gray"
                style={{
                  paddingLeft: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {section.title}
              </Text>
              <Flex direction="column" gap="1">
                {section.items.map((item) => (
                  <Link
                    className="ht-nav-link"
                    data-active={isItemActive(item.href)}
                    href={item.href as Route}
                    key={item.label}
                  >
                    <Flex align="center" gap="3">
                      {item.icon}
                      <Text size="2">{item.label}</Text>
                    </Flex>
                  </Link>
                ))}
              </Flex>
            </Flex>
          ))}
        </nav>
      </Flex>

      {/* User Profile */}
      <Box
        style={{
          marginTop: "auto",
        }}
      >
        <Flex
          align="center"
          justify="between"
          gap="3"
          style={{
            padding: "12px",
            borderRadius: "var(--radius-3)",
            backgroundColor: "var(--gray-3)",
            border: "1px solid var(--gray-5)",
          }}
        >
          <Flex gap="3" align="center" style={{ overflow: "hidden" }}>
            <Avatar
              size="2"
              radius="full"
              fallback={
                user.name
                  ? user.name.charAt(0).toUpperCase()
                  : (user.email?.charAt(0).toUpperCase() ?? "U")
              }
              color="indigo"
            />
            <Flex direction="column" style={{ overflow: "hidden" }}>
              <Text
                size="2"
                weight="bold"
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.name ?? user.email}
              </Text>
              {user.name && user.email ? (
                <Text
                  size="1"
                  color="gray"
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user.email}
                </Text>
              ) : null}
              <Text
                size="1"
                color="gray"
                style={{
                  fontSize: "10px",
                  marginTop: "2px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {user.role}
              </Text>
            </Flex>
          </Flex>

          <IconButton
            variant="ghost"
            color="gray"
            size="2"
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            title="Sign out"
            style={{ flexShrink: 0, cursor: "pointer" }}
          >
            <ExitIcon />
          </IconButton>
        </Flex>
      </Box>
    </Flex>
  );
}
