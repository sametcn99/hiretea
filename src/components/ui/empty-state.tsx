import { Flex, Heading, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  eyebrow?: string;
  children?: ReactNode;
  minHeight?: number;
};

export function EmptyState({
  title,
  description,
  eyebrow,
  children,
  minHeight = 280,
}: EmptyStateProps) {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap="3"
      py="8"
      style={{
        minHeight,
        textAlign: "center",
      }}
    >
      {eyebrow ? (
        <Text
          size="1"
          weight="bold"
          color="blue"
          style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}
        >
          {eyebrow}
        </Text>
      ) : null}
      <Flex direction="column" gap="2" align="center" style={{ maxWidth: 440 }}>
        <Heading as="h3" size="4">
          {title}
        </Heading>
        <Text as="p" size="2" color="gray">
          {description}
        </Text>
      </Flex>
      {children}
    </Flex>
  );
}
