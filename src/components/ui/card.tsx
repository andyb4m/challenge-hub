import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "hero";

// "hero" is for the one or two most prominent panels per page (e.g. the hub's
// own-profile summary) — reuses existing tokens (background.secondary, primary
// border tint) rather than a new color, so it stays distinguishable without
// every panel competing for the same amount of visual weight.
const variantClasses: Record<Variant, string> = {
  default: "border-line bg-card shadow-card",
  hero: "border-primary/25 bg-background-secondary shadow-card",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-2xl border", variantClasses[variant], className)}
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
