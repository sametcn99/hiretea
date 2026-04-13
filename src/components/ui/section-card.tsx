import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  children?: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  description,
  eyebrow,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      className={`ui segment ht-surface-card${className ? ` ${className}` : ""}`}
    >
      {(eyebrow || description) && (
        <header style={{ marginBottom: "1rem" }}>
          {eyebrow ? <p className="ht-kicker">{eyebrow}</p> : null}
          <h3 style={{ margin: "0.35rem 0 0" }}>{title}</h3>
          {description ? (
            <p className="ht-muted" style={{ margin: "0.6rem 0 0" }}>
              {description}
            </p>
          ) : null}
        </header>
      )}

      {!eyebrow && !description ? (
        <h3 style={{ marginTop: 0 }}>{title}</h3>
      ) : null}
      {children}
    </section>
  );
}
