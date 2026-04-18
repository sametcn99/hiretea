"use client";

import {
  Button,
  Callout,
  Card,
  Flex,
  Grid,
  Select,
  Separator,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { useActionState, useDeferredValue, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { ReviewerSelector } from "@/app/(app)/dashboard/candidate-cases/components/reviewer-selector";
import {
  type CreateCaseTemplateActionState,
  createCaseTemplateAction,
} from "@/app/(app)/dashboard/case-templates/actions";
import {
  buildRepositoryName,
  buildTemplateSlug,
} from "@/app/(app)/dashboard/case-templates/components/case-template-form-helpers";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  CaseTemplateReviewerOption,
  CaseTemplateSourceRepositoryOption,
} from "@/lib/case-templates/queries";

const initialCreateCaseTemplateState: CreateCaseTemplateActionState = {
  status: "idle",
};

const initialFormValues = {
  name: "",
  slug: "",
  summary: "",
  sourceRepositoryName: "",
  targetRepositoryName: "",
  reviewerInstructions: "",
  decisionGuidance: "",
  rubricCriteria: "",
};

type CaseTemplateCreateFormProps = {
  reviewerOptions: CaseTemplateReviewerOption[];
  sourceRepositories: CaseTemplateSourceRepositoryOption[];
};

type RepositoryVisibilityFilter = "all" | "private" | "public";

const RECENT_SOURCE_REPOSITORIES_STORAGE_KEY =
  "hiretea.case-template.recent-source-repositories";
const MAX_VISIBLE_SOURCE_REPOSITORIES = 8;
const MAX_RECENT_SOURCE_REPOSITORIES = 5;

function matchesSourceRepository(input: {
  repository: CaseTemplateSourceRepositoryOption;
  searchTerm: string;
  visibilityFilter: RepositoryVisibilityFilter;
  branchFilter: string;
}) {
  const normalizedSearchTerm = input.searchTerm.trim().toLowerCase();
  const matchesSearchTerm =
    normalizedSearchTerm.length === 0 ||
    [
      input.repository.fullName,
      input.repository.owner,
      input.repository.name,
      input.repository.defaultBranch,
      input.repository.description ?? "",
    ].some((value) => value.toLowerCase().includes(normalizedSearchTerm));

  const matchesVisibility =
    input.visibilityFilter === "all" ||
    (input.visibilityFilter === "private" && input.repository.isPrivate) ||
    (input.visibilityFilter === "public" && !input.repository.isPrivate);

  const matchesBranch =
    input.branchFilter === "all" ||
    input.repository.defaultBranch === input.branchFilter;

  return matchesSearchTerm && matchesVisibility && matchesBranch;
}

function getRepositorySearchScore(input: {
  repository: CaseTemplateSourceRepositoryOption;
  searchTerm: string;
}) {
  const normalizedSearchTerm = input.searchTerm.trim().toLowerCase();

  if (normalizedSearchTerm.length === 0) {
    return 0;
  }

  const fullName = input.repository.fullName.toLowerCase();
  const name = input.repository.name.toLowerCase();
  const owner = input.repository.owner.toLowerCase();
  const branch = input.repository.defaultBranch.toLowerCase();
  const description = (input.repository.description ?? "").toLowerCase();

  if (name === normalizedSearchTerm || fullName === normalizedSearchTerm) {
    return 500;
  }

  if (name.startsWith(normalizedSearchTerm)) {
    return 400;
  }

  if (fullName.startsWith(normalizedSearchTerm)) {
    return 325;
  }

  if (owner.startsWith(normalizedSearchTerm)) {
    return 250;
  }

  if (name.includes(normalizedSearchTerm)) {
    return 200;
  }

  if (fullName.includes(normalizedSearchTerm)) {
    return 175;
  }

  if (description.includes(normalizedSearchTerm)) {
    return 120;
  }

  if (branch.includes(normalizedSearchTerm)) {
    return 100;
  }

  return 0;
}

function sortSourceRepositories(input: {
  repositories: CaseTemplateSourceRepositoryOption[];
  searchTerm: string;
  recentRepositoryNames: string[];
}) {
  const recentRepositoryIndex = new Map(
    input.recentRepositoryNames.map((name, index) => [name, index]),
  );

  return [...input.repositories].sort((left, right) => {
    const leftSearchScore = getRepositorySearchScore({
      repository: left,
      searchTerm: input.searchTerm,
    });
    const rightSearchScore = getRepositorySearchScore({
      repository: right,
      searchTerm: input.searchTerm,
    });

    if (leftSearchScore !== rightSearchScore) {
      return rightSearchScore - leftSearchScore;
    }

    const leftRecentIndex = recentRepositoryIndex.get(left.name);
    const rightRecentIndex = recentRepositoryIndex.get(right.name);

    if (leftRecentIndex != null && rightRecentIndex != null) {
      return leftRecentIndex - rightRecentIndex;
    }

    if (leftRecentIndex != null) {
      return -1;
    }

    if (rightRecentIndex != null) {
      return 1;
    }

    return left.fullName.localeCompare(right.fullName, "en");
  });
}

function readRecentSourceRepositories() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  const rawValue = window.localStorage.getItem(
    RECENT_SOURCE_REPOSITORIES_STORAGE_KEY,
  );

  if (!rawValue) {
    return [] as string[];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    return Array.isArray(parsedValue)
      ? parsedValue.filter(
          (value): value is string => typeof value === "string",
        )
      : [];
  } catch {
    return [] as string[];
  }
}

function writeRecentSourceRepositories(repositoryNames: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    RECENT_SOURCE_REPOSITORIES_STORAGE_KEY,
    JSON.stringify(repositoryNames.slice(0, MAX_RECENT_SOURCE_REPOSITORIES)),
  );
}

function buildTemplateRepositoryPreview(input: {
  selectedSourceRepository: CaseTemplateSourceRepositoryOption | undefined;
  createDedicatedRepository: boolean;
  targetRepositoryName: string;
}) {
  if (!input.selectedSourceRepository) {
    return null;
  }

  return input.createDedicatedRepository
    ? `${input.selectedSourceRepository.owner}/${input.targetRepositoryName || "new-template-repository"}`
    : input.selectedSourceRepository.fullName;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      size="3"
      loading={pending}
      disabled={pending}
      type="submit"
      style={{ width: "100%" }}
    >
      Create template
    </Button>
  );
}

export function CaseTemplateCreateForm({
  reviewerOptions,
  sourceRepositories,
}: CaseTemplateCreateFormProps) {
  const [state, formAction] = useActionState(
    createCaseTemplateAction,
    initialCreateCaseTemplateState,
  );
  const [formValues, setFormValues] = useState(initialFormValues);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<string[]>([]);
  const [createDedicatedRepository, setCreateDedicatedRepository] =
    useState(false);
  const [repositorySearchTerm, setRepositorySearchTerm] = useState("");
  const [visibilityFilter, setVisibilityFilter] =
    useState<RepositoryVisibilityFilter>("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [recentRepositoryNames, setRecentRepositoryNames] = useState<string[]>(
    [],
  );
  const [hasManualSlugOverride, setHasManualSlugOverride] = useState(false);
  const [
    hasManualTargetRepositoryNameOverride,
    setHasManualTargetRepositoryNameOverride,
  ] = useState(false);
  const deferredRepositorySearchTerm = useDeferredValue(repositorySearchTerm);

  const selectedSourceRepository = sourceRepositories.find(
    (repository) => repository.name === formValues.sourceRepositoryName,
  );
  const branchOptions = [
    ...new Set(
      sourceRepositories.map((repository) => repository.defaultBranch),
    ),
  ].sort((left, right) => left.localeCompare(right, "en"));
  const filteredSourceRepositories = sortSourceRepositories({
    repositories: sourceRepositories.filter((repository) =>
      matchesSourceRepository({
        repository,
        searchTerm: deferredRepositorySearchTerm,
        visibilityFilter,
        branchFilter,
      }),
    ),
    searchTerm: deferredRepositorySearchTerm,
    recentRepositoryNames,
  });
  const recentSourceRepositories = recentRepositoryNames
    .map((repositoryName) =>
      sourceRepositories.find(
        (repository) => repository.name === repositoryName,
      ),
    )
    .filter(
      (repository): repository is CaseTemplateSourceRepositoryOption =>
        repository != null,
    );
  const primarySourceRepositories = filteredSourceRepositories.slice(
    0,
    MAX_VISIBLE_SOURCE_REPOSITORIES,
  );
  const templateRepositoryPreview = buildTemplateRepositoryPreview({
    selectedSourceRepository,
    createDedicatedRepository,
    targetRepositoryName: formValues.targetRepositoryName.trim(),
  });

  useEffect(() => {
    setRecentRepositoryNames(readRecentSourceRepositories());
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      setFormValues(initialFormValues);
      setSelectedReviewerIds([]);
      setCreateDedicatedRepository(false);
      setRepositorySearchTerm("");
      setVisibilityFilter("all");
      setBranchFilter("all");
      setHasManualSlugOverride(false);
      setHasManualTargetRepositoryNameOverride(false);
    }
  }, [state.status]);

  function handleSourceRepositorySelect(repositoryName: string) {
    setFormValues((current) => ({
      ...current,
      sourceRepositoryName: repositoryName,
    }));

    setRecentRepositoryNames((current) => {
      const nextRepositoryNames = [
        repositoryName,
        ...current.filter((name) => name !== repositoryName),
      ].slice(0, MAX_RECENT_SOURCE_REPOSITORIES);

      writeRecentSourceRepositories(nextRepositoryNames);

      return nextRepositoryNames;
    });
  }

  function handleNameChange(nextName: string) {
    setFormValues((current) => {
      const previousSlugSuggestion = buildTemplateSlug(current.name);
      const previousTargetRepositorySuggestion = buildRepositoryName(
        current.name,
      );
      const nextSlugSuggestion = buildTemplateSlug(nextName);
      const nextTargetRepositorySuggestion = buildRepositoryName(nextName);

      return {
        ...current,
        name: nextName,
        slug:
          !hasManualSlugOverride || current.slug === previousSlugSuggestion
            ? nextSlugSuggestion
            : current.slug,
        targetRepositoryName:
          !hasManualTargetRepositoryNameOverride ||
          current.targetRepositoryName === previousTargetRepositorySuggestion
            ? nextTargetRepositorySuggestion
            : current.targetRepositoryName,
      };
    });
  }

  return (
    <form action={formAction}>
      <Flex direction="column" gap="4">
        <Text size="1" color="gray">
          Fields marked with{" "}
          <Text as="span" color="red">
            *
          </Text>{" "}
          are required.
        </Text>

        <Flex direction="column" gap="2">
          <Text size="2" weight="medium">
            Find a source repository
          </Text>
          <Grid
            columns={{
              initial: "1fr",
              md: "minmax(0, 1.8fr) repeat(2, minmax(0, 1fr))",
            }}
            gap="3"
          >
            <Flex direction="column" gap="1">
              <Text
                as="label"
                size="2"
                weight="medium"
                htmlFor="repositorySearchTerm"
              >
                Search
              </Text>
              <TextField.Root
                id="repositorySearchTerm"
                placeholder="Search by owner, repo, branch, or description"
                type="text"
                value={repositorySearchTerm}
                onChange={(event) =>
                  setRepositorySearchTerm(event.target.value)
                }
              />
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Visibility
              </Text>
              <Select.Root
                value={visibilityFilter}
                onValueChange={(value) =>
                  setVisibilityFilter(value as RepositoryVisibilityFilter)
                }
              >
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="all">All repositories</Select.Item>
                  <Select.Item value="private">Private only</Select.Item>
                  <Select.Item value="public">Public only</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Default branch
              </Text>
              <Select.Root value={branchFilter} onValueChange={setBranchFilter}>
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="all">All branches</Select.Item>
                  {branchOptions.map((branch) => (
                    <Select.Item key={branch} value={branch}>
                      {branch}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>
          </Grid>
          <Text size="1" color="gray">
            Showing {filteredSourceRepositories.length} of{" "}
            {sourceRepositories.length} repositories.
          </Text>
          {recentSourceRepositories.length > 0 ? (
            <Flex wrap="wrap" gap="2">
              {recentSourceRepositories.map((repository) => (
                <Button
                  key={repository.id}
                  type="button"
                  size="1"
                  variant={
                    formValues.sourceRepositoryName === repository.name
                      ? "solid"
                      : "soft"
                  }
                  onClick={() => handleSourceRepositorySelect(repository.name)}
                >
                  {repository.fullName}
                </Button>
              ))}
            </Flex>
          ) : null}
        </Flex>

        <Grid
          columns={{ initial: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
          gap="3"
        >
          <Flex direction="column" gap="1">
            <input
              name="sourceRepositoryName"
              type="hidden"
              value={formValues.sourceRepositoryName}
            />
            <Text size="2" weight="medium">
              Source repository{" "}
              <Text as="span" color="red">
                *
              </Text>
            </Text>
            <Card size="1">
              <Flex direction="column" gap="3">
                <Text size="1" color="gray">
                  Pick from the highest-confidence matches below. Exact and
                  prefix matches rank first, then recent selections.
                </Text>
                {primarySourceRepositories.length === 0 ? (
                  <Text size="1" color="gray">
                    No repositories match the current search and filters.
                  </Text>
                ) : (
                  <Flex
                    direction="column"
                    gap="2"
                    style={{
                      maxHeight: 320,
                      overflowY: "auto",
                      paddingRight: 4,
                    }}
                  >
                    {primarySourceRepositories.map((repository, index) => {
                      const isSelected =
                        formValues.sourceRepositoryName === repository.name;
                      const isRecent = recentRepositoryNames.includes(
                        repository.name,
                      );

                      return (
                        <Flex direction="column" gap="2" key={repository.id}>
                          {index > 0 ? <Separator size="4" /> : null}
                          <button
                            type="button"
                            onClick={() =>
                              handleSourceRepositorySelect(repository.name)
                            }
                            aria-pressed={isSelected}
                            style={{
                              background: isSelected
                                ? "var(--accent-3)"
                                : "transparent",
                              border: "1px solid var(--gray-6)",
                              borderRadius: 12,
                              cursor: "pointer",
                              padding: 12,
                              textAlign: "left",
                              width: "100%",
                            }}
                          >
                            <Flex direction="column" gap="2">
                              <Flex
                                align="center"
                                justify="between"
                                gap="3"
                                wrap="wrap"
                              >
                                <Text size="2" weight="medium">
                                  {repository.fullName}
                                </Text>
                                <Flex wrap="wrap" gap="2">
                                  {isRecent ? (
                                    <StatusBadge
                                      label="Recent"
                                      tone="positive"
                                    />
                                  ) : null}
                                  {isSelected ? (
                                    <StatusBadge label="Selected" tone="info" />
                                  ) : null}
                                  <StatusBadge
                                    label={repository.defaultBranch}
                                    tone="neutral"
                                  />
                                  <StatusBadge
                                    label={
                                      repository.isPrivate
                                        ? "Private"
                                        : "Public"
                                    }
                                    tone={
                                      repository.isPrivate
                                        ? "positive"
                                        : "warning"
                                    }
                                  />
                                </Flex>
                              </Flex>
                              <Text size="1" color="gray">
                                Owner: {repository.owner}
                              </Text>
                              <Text size="1" color="gray">
                                {repository.description ??
                                  "No repository description is set in Gitea yet."}
                              </Text>
                            </Flex>
                          </button>
                        </Flex>
                      );
                    })}
                  </Flex>
                )}
                {filteredSourceRepositories.length >
                primarySourceRepositories.length ? (
                  <Text size="1" color="gray">
                    Refine the search to explore the remaining{" "}
                    {filteredSourceRepositories.length -
                      primarySourceRepositories.length}{" "}
                    repositories.
                  </Text>
                ) : null}
              </Flex>
            </Card>
            {filteredSourceRepositories.length === 0 ? (
              <Text size="1" color="gray">
                No repositories match the current search and filters.
              </Text>
            ) : null}
            {state.fieldErrors?.sourceRepositoryName?.map((error) => (
              <Text size="1" color="red" key={error}>
                {error}
              </Text>
            ))}
          </Flex>

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="name">
              Template name{" "}
              <Text as="span" color="red">
                *
              </Text>
            </Text>
            <TextField.Root
              id="name"
              name="name"
              placeholder="Backend API challenge"
              type="text"
              value={formValues.name}
              onChange={(event) => handleNameChange(event.target.value)}
              color={state.fieldErrors?.name ? "red" : undefined}
            />
            {state.fieldErrors?.name?.map((error) => (
              <Text size="1" color="red" key={error}>
                {error}
              </Text>
            ))}
          </Flex>

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="slug">
              Template slug{" "}
              <Text as="span" color="red">
                *
              </Text>
            </Text>
            <TextField.Root
              id="slug"
              name="slug"
              placeholder="backend-api-challenge"
              type="text"
              value={formValues.slug}
              onChange={(event) => {
                setHasManualSlugOverride(true);
                setFormValues((current) => ({
                  ...current,
                  slug: event.target.value,
                }));
              }}
              color={state.fieldErrors?.slug ? "red" : undefined}
            />
            {state.fieldErrors?.slug?.map((error) => (
              <Text size="1" color="red" key={error}>
                {error}
              </Text>
            ))}
          </Flex>
        </Grid>

        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="summary">
            Summary{" "}
            <Text as="span" color="red">
              *
            </Text>
          </Text>
          <TextArea
            id="summary"
            name="summary"
            placeholder="A concise description of the challenge, expected output, and review focus."
            rows={4}
            value={formValues.summary}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                summary: event.target.value,
              }))
            }
            color={state.fieldErrors?.summary ? "red" : undefined}
          />
          {state.fieldErrors?.summary?.map((error) => (
            <Text size="1" color="red" key={error}>
              {error}
            </Text>
          ))}
        </Flex>

        <Flex direction="column" gap="1">
          <Flex align="center" gap="2">
            <input
              id="createDedicatedRepository"
              name="createDedicatedRepository"
              type="checkbox"
              checked={createDedicatedRepository}
              onChange={(event) =>
                setCreateDedicatedRepository(event.target.checked)
              }
            />
            <Text
              as="label"
              size="2"
              weight="medium"
              htmlFor="createDedicatedRepository"
            >
              Create a dedicated template repository from the selected source
              repo
            </Text>
          </Flex>
          <Text size="1" color="gray">
            Leave this unchecked to register the selected repository directly as
            a case template. Check it to create a separate reusable template
            repository copied from the selected source.
          </Text>
        </Flex>

        {createDedicatedRepository ? (
          <Flex direction="column" gap="1">
            <Text
              as="label"
              size="2"
              weight="medium"
              htmlFor="targetRepositoryName"
            >
              Dedicated template repository name{" "}
              <Text as="span" color="red">
                *
              </Text>
            </Text>
            <TextField.Root
              id="targetRepositoryName"
              name="targetRepositoryName"
              placeholder="backend-code-review-template"
              type="text"
              value={formValues.targetRepositoryName}
              onChange={(event) => {
                setHasManualTargetRepositoryNameOverride(true);
                setFormValues((current) => ({
                  ...current,
                  targetRepositoryName: event.target.value,
                }));
              }}
              color={
                state.fieldErrors?.targetRepositoryName ? "red" : undefined
              }
            />
            {state.fieldErrors?.targetRepositoryName?.map((error) => (
              <Text size="1" color="red" key={error}>
                {error}
              </Text>
            ))}
          </Flex>
        ) : null}

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Selected repository details
          </Text>
          {selectedSourceRepository ? (
            <Callout.Root color="gray" size="1">
              <Flex direction="column" gap="2">
                <Flex wrap="wrap" gap="2">
                  <StatusBadge
                    label={selectedSourceRepository.fullName}
                    tone="info"
                  />
                  <StatusBadge
                    label={selectedSourceRepository.defaultBranch}
                    tone="neutral"
                  />
                  <StatusBadge
                    label={
                      selectedSourceRepository.isPrivate ? "Private" : "Public"
                    }
                    tone={
                      selectedSourceRepository.isPrivate
                        ? "positive"
                        : "warning"
                    }
                  />
                  <StatusBadge
                    label={
                      createDedicatedRepository
                        ? "Dedicated template copy"
                        : "Linked existing repository"
                    }
                    tone={createDedicatedRepository ? "positive" : "neutral"}
                  />
                </Flex>
                <Text size="2">
                  {selectedSourceRepository.description ??
                    "No repository description is set in Gitea yet."}
                </Text>
                <Text size="1" color="gray">
                  Source owner: {selectedSourceRepository.owner}
                </Text>
                <Text size="1" color="gray">
                  Template repository result: {templateRepositoryPreview}
                </Text>
              </Flex>
            </Callout.Root>
          ) : (
            <Text size="1" color="gray">
              Select a source repository to preview its default branch and
              description.
            </Text>
          )}
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Default reviewers
          </Text>
          <ReviewerSelector
            reviewers={reviewerOptions}
            selectedReviewerIds={selectedReviewerIds}
            onSelectedReviewerIdsChange={setSelectedReviewerIds}
            errorMessages={state.fieldErrors?.reviewerIds}
          />
          <Text size="1" color="gray">
            These reviewers are selected by default when this template is
            assigned to a candidate. You can still add or remove reviewers for a
            specific case before saving it.
          </Text>
        </Flex>

        <Flex direction="column" gap="1">
          <Text
            as="label"
            size="2"
            weight="medium"
            htmlFor="reviewerInstructions"
          >
            Reviewer instructions
          </Text>
          <TextArea
            id="reviewerInstructions"
            name="reviewerInstructions"
            placeholder="Describe what reviewers should verify before scoring this template."
            rows={4}
            value={formValues.reviewerInstructions}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                reviewerInstructions: event.target.value,
              }))
            }
            color={state.fieldErrors?.reviewerInstructions ? "red" : undefined}
          />
          {state.fieldErrors?.reviewerInstructions?.map((error) => (
            <Text size="1" color="red" key={error}>
              {error}
            </Text>
          ))}
        </Flex>

        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="decisionGuidance">
            Decision guidance
          </Text>
          <TextArea
            id="decisionGuidance"
            name="decisionGuidance"
            placeholder="Document what typically leads to advance, hold, or reject outcomes."
            rows={3}
            value={formValues.decisionGuidance}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                decisionGuidance: event.target.value,
              }))
            }
            color={state.fieldErrors?.decisionGuidance ? "red" : undefined}
          />
          {state.fieldErrors?.decisionGuidance?.map((error) => (
            <Text size="1" color="red" key={error}>
              {error}
            </Text>
          ))}
        </Flex>

        <Flex direction="column" gap="1">
          <Text as="label" size="2" weight="medium" htmlFor="rubricCriteria">
            Rubric criteria
          </Text>
          <TextArea
            id="rubricCriteria"
            name="rubricCriteria"
            placeholder={[
              "API design | Checks resource modeling and consistency | 40",
              "Correctness | Covers tests, edge cases, and runtime behavior | 35",
              "Communication | README, tradeoffs, and reviewer clarity | 25",
            ].join("\n")}
            rows={6}
            value={formValues.rubricCriteria}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                rubricCriteria: event.target.value,
              }))
            }
            color={state.fieldErrors?.rubricCriteria ? "red" : undefined}
          />
          <Text size="1" color="gray">
            One criterion per line using{" "}
            <strong>Title | Guidance | Weight</strong>. Guidance and weight are
            optional, but weight must be a whole number between 1 and 100 when
            provided.
          </Text>
          {state.fieldErrors?.rubricCriteria?.map((error) => (
            <Text size="1" color="red" key={error}>
              {error}
            </Text>
          ))}
        </Flex>

        <Callout.Root color="gray" size="1">
          <Callout.Text>
            The selected repository always stays the source of challenge
            content. When the dedicated-copy option is enabled, Hiretea first
            provisions a separate template repository in Gitea from that source.
            Template-level review guidance stays local to Hiretea and can evolve
            without touching repository contents. Saved reviewer defaults are
            preselected later during case assignment, but remain overrideable
            per candidate.
          </Callout.Text>
        </Callout.Root>

        {state.status === "error" && state.message ? (
          <Callout.Root color="red" size="1">
            <Callout.Text>{state.message}</Callout.Text>
          </Callout.Root>
        ) : null}

        {state.status === "success" && state.message ? (
          <Callout.Root color="green" size="1">
            <Callout.Text>{state.message}</Callout.Text>
          </Callout.Root>
        ) : null}

        <SubmitButton />
      </Flex>
    </form>
  );
}
