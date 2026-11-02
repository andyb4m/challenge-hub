import Anthropic from "@anthropic-ai/sdk";

/**
 * Lazy init, same reason as firebaseAuth()/adminDb(): the SDK throws
 * immediately if ANTHROPIC_API_KEY is missing, and module-scope
 * construction would crash next build's page-data collection whenever
 * the env var is absent (e.g. Netlify deploy previews, which run
 * without secrets).
 */
let client: Anthropic | null = null;

export function anthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}
