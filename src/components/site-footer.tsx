import { LegalLinks } from "@/components/legal-links";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-4xl px-4 py-4">
        <LegalLinks className="justify-center" />
      </div>
    </footer>
  );
}
