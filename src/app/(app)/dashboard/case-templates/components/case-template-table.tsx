import { Flex, Table, Text } from "@radix-ui/themes";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CaseTemplateListItem } from "@/lib/case-templates/queries";

type CaseTemplateTableProps = {
  templates: CaseTemplateListItem[];
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function CaseTemplateTable({ templates }: CaseTemplateTableProps) {
  if (templates.length === 0) {
    return (
      <Text as="p" size="2" color="gray">
        No case templates are available yet. Create the first reusable challenge
        from the form on the left.
      </Text>
    );
  }

  return (
    <Table.Root variant="ghost">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Template</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Repository</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Usage</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {templates.map((template) => (
          <Table.Row key={template.id}>
            <Table.Cell>
              <Flex direction="column" gap="1">
                <Text weight="bold">{template.name}</Text>
                <Text size="1" color="gray">
                  Slug: {template.slug}
                </Text>
                <Text size="1" color="gray">
                  {template.summary}
                </Text>
              </Flex>
            </Table.Cell>
            <Table.Cell>
              <Flex direction="column" gap="1">
                <StatusBadge label={template.defaultBranch} tone="info" />
                <Text size="1" color="gray">
                  {template.repositoryName}
                </Text>
                {template.repositoryDescription ? (
                  <Text size="1" color="gray">
                    {template.repositoryDescription}
                  </Text>
                ) : null}
              </Flex>
            </Table.Cell>
            <Table.Cell>
              <Flex direction="column" gap="1">
                <Text>{template.candidateCaseCount}</Text>
                <Text size="1" color="gray">
                  Assigned candidate cases
                </Text>
              </Flex>
            </Table.Cell>
            <Table.Cell>
              <Flex direction="column" gap="1">
                <Text>{dateFormatter.format(template.createdAt)}</Text>
                <Text size="1" color="gray">
                  Owner: {template.createdByName}
                </Text>
              </Flex>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
