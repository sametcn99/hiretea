"use client";

import { Button, Flex, Text } from "@radix-ui/themes";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type CandidateCaseFiltersProps = {
  showArchived: boolean;
};

export function CandidateCaseFilters({
  showArchived,
}: CandidateCaseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateArchivedFilter(nextValue: boolean) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextValue) {
      params.set("archived", "1");
    } else {
      params.delete("archived");
    }

    const nextUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;

    startTransition(() => {
      router.push(nextUrl as Route);
    });
  }

  return (
    <Flex justify="between" align="center" gap="3" mb="4" wrap="wrap">
      <Text size="2" color="gray">
        {showArchived
          ? "Showing active and archived candidate cases."
          : "Showing active candidate cases only."}
      </Text>
      <Button
        type="button"
        variant={showArchived ? "solid" : "soft"}
        color={showArchived ? "blue" : "gray"}
        onClick={() => updateArchivedFilter(!showArchived)}
        loading={isPending}
      >
        {showArchived ? "Hide archived" : "Show archived"}
      </Button>
    </Flex>
  );
}
