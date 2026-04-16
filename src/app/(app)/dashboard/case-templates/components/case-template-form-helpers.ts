type RubricCriterionLike = {
  title: string;
  description?: string | null;
  weight?: number | null;
};

export function buildTemplateSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildRepositoryName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/_{2,}/g, "_");
}

export function formatRubricCriteriaInput(criteria: RubricCriterionLike[]) {
  return criteria
    .map((criterion) => {
      const parts = [criterion.title.trim()];

      if (criterion.description?.trim() || criterion.weight != null) {
        parts.push(criterion.description?.trim() ?? "");
      }

      if (criterion.weight != null) {
        parts.push(String(criterion.weight));
      }

      return parts.join(" | ");
    })
    .join("\n");
}
