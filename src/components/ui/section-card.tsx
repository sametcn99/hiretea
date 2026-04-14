import { Card, Flex, Heading, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function SectionCard({
  title,
  description,
  eyebrow,
  children,
  className,
  style,
}: SectionCardProps) {
  return (
    <Card asChild size="3" className={className} style={style}>
      <section>
        {(eyebrow || description) && (
          <Flex direction="column" gap="1" mb="4">
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
            <Heading as="h3" size="4">
              {title}
            </Heading>
            {description ? (
              <Text as="p" size="2" color="gray">
                {description}
              </Text>
            ) : null}
          </Flex>
        )}

        {!eyebrow && !description ? (
          <Heading as="h3" size="4" mb="3">
            {title}
          </Heading>
        ) : null}
        {children}
      </section>
    </Card>
  );
}
