import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/require-auth";
import { findChallengeByTokenServer } from "@/lib/challenges/invite-server";
import { challengeSummary } from "@/lib/challenges/scoring";
import { JoinContent } from "./join-content";

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const challenge = await findChallengeByTokenServer(params.token);

  if (!challenge) {
    return { title: "Invite | Challenge Hub" };
  }

  const title = `You're invited: ${challenge.name}`;
  const description = challenge.description || challengeSummary(challenge);

  return {
    title: `${title} | Challenge Hub`,
    description,
    openGraph: {
      title,
      description,
      siteName: "Challenge Hub",
      type: "website",
      images: ["/icons/icon-512.png"],
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function JoinPage({ params }: { params: { token: string } }) {
  return (
    <RequireAuth>
      <main className="flex min-h-[70vh] items-center justify-center p-4">
        <JoinContent token={params.token} />
      </main>
    </RequireAuth>
  );
}
