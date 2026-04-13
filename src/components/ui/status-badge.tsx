type StatusTone = "info" | "neutral" | "positive" | "warning";

const toneClassMap: Record<StatusTone, string> = {
  info: "blue",
  neutral: "grey",
  positive: "green",
  warning: "yellow",
};

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span className={`ui ${toneClassMap[tone]} label ht-status-badge`}>
      {label}
    </span>
  );
}
