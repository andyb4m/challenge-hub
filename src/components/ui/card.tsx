import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "hero";

// Flat by design — no border, no ambient shadow. Surfaces separate from the
// page by background color alone (bg-card vs. the darker page background).
// "hero" is for the one or two most prominent panels per page (e.g. the hub's
// own-profile summary) — reuses the existing background.secondary token
// rather than a new color, so it stays distinguishable without every panel
// competing for the same amount of visual weight.
const variantClasses: Record<Variant, string> = {
  default: "bg-card",
  hero: "bg-background-secondary",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-2xl", variantClasses[variant], className)}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
  );
}
