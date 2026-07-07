import type { Metadata } from "next";
import { LegalSection as Section } from "@/components/legal-section";

export const metadata: Metadata = {
  title: "Datenschutzerklärung | Challenge Hub",
};

export default function DatenschutzPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Datenschutzerklärung
        </h1>
        <p className="mt-1 text-sm text-muted">Stand: Juli 2026</p>
      </div>

      <Section title="1. Verantwortlicher">
        <p>
          Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO)
          ist:
        </p>
        <p className="text-foreground">
          Mark Andreas Voinescu
          <br />
          Nording 172
          <br />
          90409 Nürnberg, Deutschland
          <br />
          E-Mail:{" "}
          <a
            href="mailto:andy.voinescu@web.de"
            className="text-primary-light hover:underline"
          >
            andy.voinescu@web.de
          </a>
        </p>
      </Section>

      <Section title="2. Welche Daten wir verarbeiten">
        <p>
          Challenge Hub ist eine private, nicht-kommerzielle Plattform für
          einen geschlossenen Freundeskreis, auf der gemeinsame
          Fitness-Challenges organisiert werden. Bei der Nutzung verarbeiten
          wir:
        </p>
        <ul className="list-disc pl-5">
          <li>
            <span className="text-foreground">Kontodaten:</span> E-Mail-Adresse,
            angezeigter Name sowie – bei Anmeldung über Google – die von
            Google bereitgestellten Basisdaten (Name, E-Mail-Adresse,
            Profilbild).
          </li>
          <li>
            <span className="text-foreground">Challenge- und Aktivitätsdaten:</span>{" "}
            von dir angelegte oder beigetretene Challenges sowie manuell
            erfasste Trainingsaktivitäten (Sportart, Dauer, Distanz,
            Trainingszonen bzw. Punkte, je nach Challenge-Format).
          </li>
          <li>
            <span className="text-foreground">Strava-Daten (optional):</span>{" "}
            wenn du dein Strava-Konto verbindest, rufen wir über die
            Strava-API deine Trainingsaktivitäten ab (Name, Sportart, Distanz,
            Dauer, Startzeit, Streckenverlauf sowie – für Punkte-Challenges –
            deine Herzfrequenzzonen) und gleichen sie automatisch mit deinen
            Challenges ab. Du kannst die Verbindung jederzeit über die
            Profilseite trennen; danach werden keine weiteren Aktivitäten
            mehr abgerufen.
          </li>
          <li>
            <span className="text-foreground">Nutzungsdaten:</span> technische
            Daten, die beim Betrieb der Anwendung anfallen (z. B.
            Anmeldezeitpunkte), soweit sie von Firebase Authentication
            bereitgestellt werden.
          </li>
        </ul>
        <p>
          Ein Profilbild-Upload ist im Code vorbereitet, aber aktuell
          deaktiviert und wird nicht verarbeitet, solange diese Funktion
          nicht aktiv geschaltet ist.
        </p>
      </Section>

      <Section title="3. Rechtsgrundlagen">
        <p>
          Die Verarbeitung erfolgt zur Erfüllung des Nutzungsvertrags, den du
          mit der Registrierung eingehst (Art. 6 Abs. 1 lit. b DSGVO), sowie
          – bei der Anmeldung über Google – auf Grundlage deiner Einwilligung
          gegenüber Google bei der Auswahl dieses Anmeldewegs (Art. 6 Abs. 1
          lit. a DSGVO).
        </p>
      </Section>

      <Section title="4. Empfänger und Auftragsverarbeiter">
        <p>Wir setzen folgende Dienstleister ein, die für uns Daten verarbeiten:</p>
        <ul className="list-disc pl-5">
          <li>
            <span className="text-foreground">Google Firebase</span>{" "}
            (Authentifizierung und Datenbank, Google Ireland Limited /
            Google LLC) – ein Auftragsverarbeitungsvertrag auf Basis des
            Google Cloud Data Processing Addendum liegt vor.
          </li>
          <li>
            <span className="text-foreground">Netlify, Inc.</span> (Hosting der
            Webanwendung).
          </li>
          <li>
            <span className="text-foreground">Strava, Inc.</span> – nur wenn du
            dein Strava-Konto aktiv verbindest. Der Abruf deiner
            Trainingsdaten erfolgt auf Grundlage deiner Einwilligung
            (OAuth-Autorisierung bei Strava) und unterliegt zusätzlich
            Stravas eigener Datenschutzerklärung.
          </li>
        </ul>
        <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          Zu prüfen/ergänzen: Serverstandort der Firestore-Datenbank (Google
          Cloud Console → Firestore → Standort) und ob Daten dadurch
          außerhalb der EU/des EWR verarbeitet werden. Falls ja, sind die
          eingesetzten Garantien (z. B. EU-Standardvertragsklauseln) hier zu
          ergänzen.
        </p>
      </Section>

      <Section title="5. Speicherdauer">
        <p>
          Deine Daten werden gespeichert, solange dein Konto besteht. Du
          kannst dein Konto und alle damit verbundenen Daten (Profil,
          Challenge-Mitgliedschaften, erfasste Aktivitäten) jederzeit
          eigenständig über die Profilseite löschen. Alternativ kannst du
          eine Löschung formlos per E-Mail an die oben genannte Adresse
          anfragen.
        </p>
      </Section>

      <Section title="6. Deine Rechte">
        <p>Dir stehen nach der DSGVO folgende Rechte zu:</p>
        <ul className="list-disc pl-5">
          <li>Auskunft über die von uns gespeicherten Daten (Art. 15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
          <li>Löschung deiner Daten (Art. 17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        </ul>
        <p>
          Wende dich hierfür an die oben genannte E-Mail-Adresse. Außerdem
          steht dir ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde
          zu, z. B. dem Bayerischen Landesamt für Datenschutzaufsicht (BayLDA).
        </p>
      </Section>

      <Section title="7. Cookies und lokale Speicherung">
        <p>
          Für die Anmeldung nutzt Firebase Authentication technisch
          notwendige Daten im lokalen Speicher deines Browsers
          (localStorage/IndexedDB), um dich angemeldet zu halten. Es werden
          keine Tracking- oder Marketing-Cookies eingesetzt.
        </p>
      </Section>

      <Section title="8. Strava-Anbindung">
        <p>
          Die optionale Strava-Anbindung ist aktiv. Nach dem Verbinden
          deines Konto ruft die Anwendung neue Aktivitäten automatisch ab
          (über einen von Strava bereitgestellten Webhook) und gleicht sie
          mit deinen laufenden Challenges ab. Gelöschte Aktivitäten werden
          entsprechend auch bei uns entfernt. Du kannst die Verbindung
          jederzeit selbst über die Profilseite trennen.
        </p>
      </Section>

      <Section title="9. Automatisierte Entscheidungsfindung">
        <p>
          Es findet keine automatisierte Entscheidungsfindung oder
          Profilbildung im Sinne von Art. 22 DSGVO statt. Rangfolgen in
          Challenges werden ausschließlich zur Anzeige innerhalb der von dir
          genutzten Challenges berechnet.
        </p>
      </Section>
    </main>
  );
}
