"use client";

import type { UserRole } from "@prisma/client";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AppNavigationProps = {
  role: UserRole;
};

type NavigationItem = {
  href: string;
  label: string;
};

const baseItems: NavigationItem[] = [{ href: "/dashboard", label: "Overview" }];

const managementItems: NavigationItem[] = [
  { href: "/dashboard/candidates", label: "Candidates" },
  { href: "/dashboard/case-templates", label: "Case templates" },
  { href: "/dashboard/candidate-cases", label: "Candidate cases" },
  { href: "/dashboard/reviews", label: "Reviews" },
  { href: "/dashboard/audit-trail", label: "Audit trail" },
];

const adminItems: NavigationItem[] = [
  { href: "/dashboard/settings", label: "Settings" },
];

export function AppNavigation({ role }: AppNavigationProps) {
  const pathname = usePathname();
  const items =
    role === "CANDIDATE"
      ? baseItems
      : role === "ADMIN"
        ? [...baseItems, ...managementItems, ...adminItems]
        : [...baseItems, ...managementItems];

  return (
    <nav
      aria-label="Primary navigation"
      className="ui secondary vertical pointing menu fluid"
    >
      {items.map((item) => (
        <Link
          className={`item ${pathname === item.href ? "active" : ""}`}
          href={item.href as Route}
          key={item.label}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
