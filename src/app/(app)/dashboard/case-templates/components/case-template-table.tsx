"use client";

import { Button, Code, Flex, Table, Text } from "@radix-ui/themes";
import { useToast } from "@/components/providers/toast-provider";
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

async function copyCloneCommand(input: {
  cloneCommand: string;
  showToast: ReturnType<typeof useToast>["showToast"];
}) {
  try {
    await navigator.clipboard.writeText(input.cloneCommand);
    input.showToast({
      tone: "success",
      title: "Clone command copied",
      description: "The repository clone command is now in your clipboard.",
    });
  } catch {
    input.showToast({
      tone: "error",
      title: "Clipboard copy failed",
      description: "Copy the clone command manually from the template library.",
    });
  }
}

export function CaseTemplateTable({
  templates,
  workspaceBaseUrl,
  workspaceOrganization,
}: CaseTemplateTableProps) {
  const { showToast } = useToast();

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
          <Table.ColumnHeaderCell>Review kit</Table.ColumnHeaderCell>
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
                  {repositoryUrl ? (
                    <Text asChild size="1" color="blue">
                      <a href={repositoryUrl} target="_blank" rel="noreferrer">
                        Open in Gitea
                      </a>
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
                    <Button
                      type="button"
                      variant="soft"
                      color="gray"
                      size="1"
                      onClick={() =>
                        copyCloneCommand({ cloneCommand, showToast })
                      }
                      style={{
                        justifyContent: "flex-start",
                        maxWidth: "100%",
                        paddingInline: 0,
                        paddingBlock: 0,
                      }}
                    >
                      <Code
                        size="1"
                        variant="soft"
                        style={{
                          display: "block",
                          overflowWrap: "anywhere",
                          whiteSpace: "pre-wrap",
                          width: "100%",
                          cursor: "pointer",
                        }}
                      >
                        {cloneCommand}
                      </Code>
                    </Button>
                  ) : null}
                </Flex>
              </Table.Cell>
              <Table.Cell>
                <Flex direction="column" gap="1">
                  <StatusBadge
                    label={
                      template.hasTemplateReviewGuide
                        ? "Template review guide ready"
                        : "No review guide yet"
                    }
                    tone={
                      template.hasTemplateReviewGuide ? "positive" : "neutral"
                    }
                  />
                  <Text size="1" color="gray">
                    {template.rubricCriteriaCount > 0
                      ? `${template.rubricCriteriaCount} rubric criteria configured.`
                      : "No rubric criteria defined yet."}
                  </Text>
                  <Text size="1" color="gray">
                    {template.defaultReviewerNames.length > 0
                      ? `Default reviewers: ${template.defaultReviewerNames.join(", ")}`
                      : "Default reviewers: none"}
                  </Text>
                  {template.reviewerInstructions ? (
                    <Text size="1" color="gray">
                      {template.reviewerInstructions}
                    </Text>
                  ) : template.decisionGuidance ? (
                    <Text size="1" color="gray">
                      {template.decisionGuidance}
                    </Text>
                  ) : null}
                  {template.rubricCriteriaPreview.length > 0 ? (
                    <Text size="1" color="gray">
                      Criteria:{" "}
                      {template.rubricCriteriaPreview
                        .map((criterion) =>
                          criterion.weight
                            ? `${criterion.title} (${criterion.weight})`
                            : criterion.title,
                        )
                        .join(", ")}
                      {template.rubricCriteriaCount >
                      template.rubricCriteriaPreview.length
                        ? `, +${template.rubricCriteriaCount - template.rubricCriteriaPreview.length} more`
                        : ""}
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
          );
        })}
      </Table.Body>
    </Table.Root>
  );
}
