import { Badge } from "@radix-ui/themes";

type StatusTone = "info" | "neutral" | "positive" | "warning";

const toneColorMap: Record<StatusTone, "blue" | "gray" | "green" | "orange"> = {
  info: "blue",
  neutral: "gray",
  positive: "green",
  warning: "orange",
};

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <Badge variant="soft" color={toneColorMap[tone]}>
      {label}
    </Badge>
  );
}
