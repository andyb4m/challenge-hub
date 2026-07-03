import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Impressum | Challenge Hub",
};

export default function ImpressumPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 py-8">
      <h1 className="text-2xl font-bold text-foreground">Impressum</h1>

      <Card>
        <CardHeader>
          <CardTitle>Angaben gemäß § 5 DDG</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm text-muted">
          <p className="text-foreground">Mark Andreas Voinescu</p>
          <p>Nording 172</p>
          <p>90409 Nürnberg</p>
          <p>Deutschland</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kontakt</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted">
          <p>
            E-Mail:{" "}
            <a
              href="mailto:andy.voinescu@web.de"
              className="text-primary-light hover:underline"
            >
              andy.voinescu@web.de
            </a>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted">
          <p>Mark Andreas Voinescu (Anschrift wie oben)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hinweis</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted">
          <p>
            Challenge Hub ist ein privat betriebenes, nicht-kommerzielles
            Angebot für einen geschlossenen Freundeskreis zur gemeinsamen
            Durchführung von Fitness-Challenges.
          </p>
          <p>
            Wir sind bemüht, die Inhalte dieser Seite stets aktuell und
            korrekt zu halten, übernehmen jedoch keine Gewähr für die
            Vollständigkeit, Richtigkeit und Aktualität der bereitgestellten
            Informationen.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
