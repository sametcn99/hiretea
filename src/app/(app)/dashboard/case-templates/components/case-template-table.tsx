"use client";

import type { KeyboardEvent } from "react";
import { Code, Flex, Table, Text } from "@radix-ui/themes";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CaseTemplateListItem } from "@/lib/case-templates/queries";

type CaseTemplateTableProps = {
  templates: CaseTemplateListItem[];
  workspaceBaseUrl: string | null;
  workspaceOrganization: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

function buildRepositoryUrl(input: {
  workspaceBaseUrl: string | null;
  workspaceOrganization: string | null;
  repositoryName: string;
}) {
  if (!input.workspaceBaseUrl || !input.workspaceOrganization) {
    return null;
  }

  return new URL(
    `${input.workspaceOrganization}/${input.repositoryName}`,
    `${input.workspaceBaseUrl.replace(/\/$/, "")}/`,
  ).toString();
}

function buildCloneCommand(repositoryUrl: string | null) {
  return repositoryUrl ? `git clone ${repositoryUrl}.git` : null;
}

function openRepository(repositoryUrl: string | null) {
  if (!repositoryUrl) {
    return;
  }

  window.open(repositoryUrl, "_blank", "noopener,noreferrer");
}

function handleRowKeyDown(
  event: KeyboardEvent<HTMLTableRowElement>,
  repositoryUrl: string | null,
) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  openRepository(repositoryUrl);
}

export function CaseTemplateTable({
  templates,
  workspaceBaseUrl,
  workspaceOrganization,
}: CaseTemplateTableProps) {
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
        {templates.map((template) => {
          const repositoryUrl = buildRepositoryUrl({
            workspaceBaseUrl,
            workspaceOrganization,
            repositoryName: template.repositoryName,
          });
          const cloneCommand = buildCloneCommand(repositoryUrl);

          return (
          <Table.Row
            key={template.id}
            onClick={() => openRepository(repositoryUrl)}
            onKeyDown={(event) => handleRowKeyDown(event, repositoryUrl)}
            tabIndex={repositoryUrl ? 0 : -1}
            style={{
              cursor: repositoryUrl ? "pointer" : "default",
            }}
          >
            <Table.Cell>
              <Flex direction="column" gap="1">
                <Text weight="bold">{template.name}</Text>
                <Text size="1" color="gray">
                  Slug: {template.slug}
                </Text>
                <Text size="1" color="gray">
                  {template.summary}
                </Text>
                {repositoryUrl ? (
                  <Text size="1" color="blue">
                    Open in Gitea
                  </Text>
                ) : null}
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
                {cloneCommand ? (
                  <Code
                    size="1"
                    variant="soft"
                    style={{
                      display: "block",
                      overflowWrap: "anywhere",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {cloneCommand}
                  </Code>
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
        );})}
      </Table.Body>
    </Table.Root>
  );
}
