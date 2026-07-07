import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-4 text-xs text-faint">
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
    </footer>
  );
}
