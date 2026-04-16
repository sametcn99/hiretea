"use client";

import type { UserRole } from "@prisma/client";
import {
  ActivityLogIcon,
  ArchiveIcon,
  Component1Icon,
  DashboardIcon,
  GearIcon,
  MagnifyingGlassIcon,
  PersonIcon,
  TokensIcon,
} from "@radix-ui/react-icons";
import { Box, Flex, Text } from "@radix-ui/themes";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

const candidateItems: NavigationItem[] = [
  ...baseItems,
  { href: "/dashboard/my-cases", label: "My cases", icon: <ArchiveIcon /> },
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
    if (role === "CANDIDATE") {
      return [{ title: "Main", items: candidateItems }];
    }

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
          paddingTop: "1rem",
          borderTop: "1px solid var(--gray-6)",
          marginTop: "auto",
        }}
      >
        <Flex direction="column" gap="1">
          <Text size="2" weight="bold">
            {user.name ?? user.email}
          </Text>
          <Text size="1" color="gray">
            {user.role}
          </Text>
        </Flex>
      </Box>
    </Flex>
  );
}
