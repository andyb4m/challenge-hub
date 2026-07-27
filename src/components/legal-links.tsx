import Link from "next/link";
import { cn } from "@/lib/utils";

export function LegalLinks({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint",
        className
      )}
    >
      <Link href="/impressum" className="hover:text-muted">
        Impressum
      </Link>
      <Link href="/datenschutz" className="hover:text-muted">
        Datenschutz
      </Link>
      <Link href="/terms" className="hover:text-muted">
        Terms
      </Link>
    </div>
  );
}
