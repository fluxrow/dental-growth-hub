import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type EmptyStateStep = {
  title: string;
  description?: string;
};

export type EmptyStateProps = {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  steps: EmptyStateStep[];
  primary: { label: string; href?: string; onClick?: () => void };
  secondary?: { label: string; href?: string; onClick?: () => void };
  tip?: string;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
  steps,
  primary,
  secondary,
  tip,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-surface",
        className,
      )}
    >
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-gradient-to-br from-primary/15 to-chart-2/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 size-72 rounded-full bg-gradient-to-tr from-accent to-transparent blur-3xl" />

      <div className="relative grid lg:grid-cols-[1.1fr_1fr] gap-0">
        {/* Left: message + CTAs */}
        <div className="p-8 lg:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground flex items-center justify-center shadow-sm">
              <Icon className="size-5" />
            </div>
            {eyebrow && (
              <span className="text-3xs uppercase tracking-wider font-semibold text-primary/90">
                {eyebrow}
              </span>
            )}
          </div>

          <h2 className="font-display text-[22px] sm:text-[26px] leading-tight font-semibold tracking-tight">
            {title}
          </h2>
          <p className="mt-2 text-sm-minus text-muted-foreground max-w-md leading-relaxed">
            {description}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <CTAButton variant="primary" {...primary} />
            {secondary && <CTAButton variant="ghost" {...secondary} />}
          </div>

          {tip && (
            <div className="mt-5 inline-flex items-start gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground max-w-md">
              <Sparkles className="size-3.5 mt-0.5 text-primary shrink-0" />
              <span>{tip}</span>
            </div>
          )}
        </div>

        {/* Right: numbered steps */}
        <div className="border-t lg:border-t-0 lg:border-l border-border bg-gradient-to-b from-accent/40 to-transparent p-8 lg:p-10">
          <div className="text-3xs uppercase tracking-wider font-semibold text-muted-foreground mb-4">
            Próximos passos
          </div>
          <ol className="space-y-3.5">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <div className="size-7 rounded-full bg-background border border-border text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums text-primary">
                  {i + 1}
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="text-sm-minus font-medium leading-snug">{s.title}</div>
                  {s.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {s.description}
                    </div>
                  )}
                </div>
                <CheckCircle2 className="size-4 text-muted-foreground/30 shrink-0 mt-1" />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function CTAButton({
  variant,
  label,
  href,
  onClick,
}: {
  variant: "primary" | "ghost";
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const cls =
    variant === "primary"
      ? "h-10 px-4 bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
      : "h-10 px-4 border border-input bg-background text-foreground/80 hover:bg-muted";
  const content = (
    <span className="inline-flex items-center gap-1.5 text-sm-minus font-medium">
      {label} <ArrowRight className="size-3.5" />
    </span>
  );
  if (href) {
    return (
      <Link to={href as never} className={cn("rounded-md inline-flex items-center", cls)}>
        {content}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={cn("rounded-md inline-flex items-center", cls)}>
      {content}
    </button>
  );
}
