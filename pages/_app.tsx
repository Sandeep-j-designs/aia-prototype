import "@/styles/globals.css";
import "@/styles/neo-workspace.css";
import type { AppProps } from "next/app";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import GuideProvider from "@/components/guide/guide-provider";
import NeoProvider from "@/components/neo/provider";
import NeoShell from "@/components/neo/shell";
import NeoPanel from "@/components/neo";
import NeoPresence from "@/components/neo/presence";
import ReconWelcome from "@/components/neo/onboarding/recon-welcome";

const open_sans = localFont({
  src: "../public/fonts/open-sans-latin.woff2",
  weight: "300 800",
  display: "swap",
});
// IBM Plex Mono for voucher and invoice IDs inside Neo's documents.
const plexMono = localFont({
  src: [
    {
      path: "../public/fonts/ibm-plex-mono-latin-400-normal.woff2",
      weight: "400",
    },
    {
      path: "../public/fonts/ibm-plex-mono-latin-500-normal.woff2",
      weight: "500",
    },
    {
      path: "../public/fonts/ibm-plex-mono-latin-600-normal.woff2",
      weight: "600",
    },
  ],
  display: "swap",
});
// Source Serif 4 is Neo's reading voice (ported from AIA 2.0): its answers are
// set apart from the UI the way a chat assistant's are. The latin-ext cut is a
// second family only for ₹, which the latin cut lacks.
const sourceSerif = localFont({
  src: [
    {
      path: "../public/fonts/source-serif-4-latin-wght-normal.woff2",
      weight: "200 900",
      style: "normal",
    },
    {
      path: "../public/fonts/source-serif-4-latin-wght-italic.woff2",
      weight: "200 900",
      style: "italic",
    },
  ],
  display: "swap",
});
const sourceSerifExt = localFont({
  src: "../public/fonts/source-serif-4-latin-ext-wght-normal.woff2",
  weight: "200 900",
  display: "swap",
});

/**
 * PROTOTYPE STUB — mirrors pages/_app.tsx in aiaccountant-app.
 *
 * Production additionally mounts SessionProvider, QueryClientProvider,
 * EnvProvider, GuideProvider and the app-effects (AuthEffects, SetupGuard,
 * AppConfigPoller, AblyNotifications, UserCompaniesSync, BillingAccessGuard)
 * plus the global BulkUpload modal. None of those are needed to render a
 * screen, so they are omitted here.
 *
 * On handoff this file is DISCARDED — the real _app.tsx already provides the
 * font wrapper and the Toaster.
 */
export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${open_sans.className}`}>
      <style jsx global>{`
        :root {
          --font-family-primary:
            ${open_sans.style.fontFamily}, system-ui, sans-serif;
          --font-family-display: ${open_sans.style.fontFamily};
          --font-family-mono: ${plexMono.style.fontFamily};
          --font-family-reading:
            ${sourceSerif.style.fontFamily}, ${sourceSerifExt.style.fontFamily},
            Georgia, serif;
        }
      `}</style>
      {/* GuideProvider is mounted in production's _app.tsx too — a journey
          outlives the route it starts on, so it cannot live inside one. */}
      <GuideProvider>
        <NeoProvider>
          <NeoShell>
            <Component {...pageProps} />
          </NeoShell>
          <NeoPanel />
          <NeoPresence />
          {/* Three-way reconciliation's welcome: opens on every load. */}
          <ReconWelcome />
        </NeoProvider>
      </GuideProvider>
      <Toaster position="bottom-right" closeButton />
    </div>
  );
}
