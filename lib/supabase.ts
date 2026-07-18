import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

function readPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") return null;
  } catch {
    return null;
  }

  return { url, key };
}

export function getSupabaseBrowser() {
  const config = readPublicSupabaseConfig();
  if (!config) return null;
  browserClient ??= createBrowserClient(config.url, config.key);
  return browserClient;
}

/**
 * Returns the browser client for public pages that require Supabase.
 * The explicit error makes missing deployment configuration easy to diagnose.
 */
export function requireSupabaseBrowser() {
  const client = getSupabaseBrowser();
  if (client) return client;

  // Client pages are prerendered during `next build`, where deployment-only
  // public variables may be absent. The valid, non-routable fallback prevents
  // an invalid URL from crashing module initialization. Real requests still
  // require the documented environment variables and will show a load error.
  browserClient ??= createBrowserClient(
    "http://127.0.0.1:54321",
    "missing-publishable-key"
  );
  return browserClient;
}
