import type { Metadata } from "next";
import { LegalSection as Section } from "@/components/legal-section";

export const metadata: Metadata = {
  title: "Terms of Service | Challenge Hub",
};

export default function TermsPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Terms of Service
        </h1>
        <p className="mt-1 text-sm text-muted">Last updated: July 2026</p>
      </div>

      <Section title="1. What this is">
        <p>
          Challenge Hub is a privately run, non-commercial app for a closed
          group of friends to run shared fitness challenges. It&apos;s
          operated by one person as a hobby project, not a company — see the{" "}
          <a href="/impressum" className="text-primary-light hover:underline">
            Impressum
          </a>{" "}
          for who&apos;s responsible for it. These terms describe what you
          can expect using it, and what&apos;s expected of you.
        </p>
      </Section>

      <Section title="2. Your account">
        <p>
          You need an account to use Challenge Hub. You&apos;re responsible
          for keeping your password confidential and for anything that
          happens under your account. Joining a specific challenge requires
          an invite link from someone already in it — creating an account by
          itself doesn&apos;t give you access to anyone else&apos;s
          challenges or data.
        </p>
      </Section>

      <Section title="3. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5">
          <li>
            Use the app to harass, abuse, or impersonate other members
          </li>
          <li>
            Post illegal, hateful, or knowingly false content in challenge
            names, descriptions, or activity entries
          </li>
          <li>
            Try to access another member&apos;s account or data you
            weren&apos;t given access to
          </li>
          <li>
            Interfere with the app&apos;s operation (e.g. attempting to
            overload it or bypass its access controls)
          </li>
        </ul>
        <p>
          Since this is a small, closed, friends-based app, enforcement here
          is informal — but a violation can result in your account or a
          specific challenge being removed.
        </p>
      </Section>

      <Section title="4. Your content">
        <p>
          You keep ownership of what you enter — challenge names and
          descriptions, activity entries, your display name and photo.
          By using the app you allow it to store and display that content
          to other members of challenges you&apos;re part of, which is the
          whole point of a shared leaderboard.
        </p>
      </Section>

      <Section title="5. Strava integration">
        <p>
          Connecting Strava is optional. If you connect it, activities you
          record on Strava are synced automatically into any goal or zone
          challenge you&apos;re part of, using your own Strava data —
          see the{" "}
          <a
            href="/datenschutz"
            className="text-primary-light hover:underline"
          >
            Datenschutzerklärung
          </a>{" "}
          for exactly what&apos;s read and stored. Using Strava through this
          integration is also subject to Strava&apos;s own terms of service.
        </p>
      </Section>

      <Section title="6. No guarantees">
        <p>
          This is a hobby project run by one person in their spare time,
          not a commercial service with a support team or an uptime
          guarantee. It&apos;s provided &quot;as is&quot; — features can
          change, and the app can go offline or be discontinued, without
          notice. Scoring, leaderboards, and Strava sync are provided in
          good faith but aren&apos;t guaranteed to be error-free; don&apos;t
          rely on this app for anything where that would matter.
        </p>
      </Section>

      <Section title="7. Liability">
        <p>
          To the extent permitted by law, the operator isn&apos;t liable for
          indirect damages or lost data arising from your use of the app.
          Nothing here limits liability for intent or gross negligence, or
          other liability that can&apos;t be excluded under German law.
        </p>
      </Section>

      <Section title="8. Ending your account">
        <p>
          You can delete your account and your own data at any time from
          your profile page — see the Datenschutzerklärung for exactly
          what that removes. The operator can also remove an account for a
          clear violation of section 3.
        </p>
      </Section>

      <Section title="9. Changes to these terms">
        <p>
          These terms may be updated as the app changes. Material changes
          will be reflected here with an updated date at the top of this
          page.
        </p>
      </Section>

      <Section title="10. Governing law">
        <p>
          These terms are governed by German law. See the{" "}
          <a href="/impressum" className="text-primary-light hover:underline">
            Impressum
          </a>{" "}
          for contact details if you have questions.
        </p>
      </Section>
    </main>
  );
}
