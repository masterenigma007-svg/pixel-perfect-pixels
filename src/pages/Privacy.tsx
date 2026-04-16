import { Link } from "react-router-dom";
import { useEffect } from "react";

const EFFECTIVE_DATE = "April 16, 2026";
const CONTACT_EMAIL = "support@relationshipsaver.app";

export default function Privacy() {
  useEffect(() => {
    document.title = "Privacy Policy — Relationship Saver";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute(
        "content",
        "Privacy policy for Relationship Saver: we collect no personal data. Everything stays on your device."
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-5 py-10 sm:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          ← Back to app
        </Link>

        <header className="mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Effective {EFFECTIVE_DATE}
          </p>
        </header>

        <article className="space-y-8 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-2">The short version</h2>
            <p className="text-muted-foreground">
              Relationship Saver collects <strong className="text-foreground">no personal information</strong>,
              uses <strong className="text-foreground">no analytics</strong>, sends
              <strong className="text-foreground"> no data to any server</strong>, and shows
              <strong className="text-foreground"> no ads</strong>. Everything you do in the app stays on your device.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">What we do not collect</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>No name, email, phone number, or account information</li>
              <li>No location data</li>
              <li>No advertising identifiers (IDFA / AAID)</li>
              <li>No analytics, crash reports, or telemetry</li>
              <li>No contacts, calendar, photos, or files</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">What stays on your device</h2>
            <p className="text-muted-foreground mb-2">
              The app uses your device's local storage to remember:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Your translation history (last 50 entries)</li>
              <li>Newlywed Game player names and scores during a session</li>
              <li>Truth or Dare player setup during a session</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              You can clear all of this at any time by deleting the app or clearing site data in your browser.
              Nothing is ever transmitted off your device.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Microphone &amp; speech</h2>
            <p className="text-muted-foreground">
              If you tap the microphone icon, the app uses your device's built-in speech-recognition engine
              (provided by your operating system or browser) to convert your voice into text locally. We never
              record, store, or transmit your audio. The translated reply is spoken back using your device's
              built-in text-to-speech voices — also entirely on-device.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Third parties</h2>
            <p className="text-muted-foreground">
              The app does not integrate with any third-party advertising, analytics, tracking, or social
              networking SDKs. The only network requests the app makes are to load the app itself and its
              fonts from Google Fonts, which may receive your IP address as part of any standard web request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Children</h2>
            <p className="text-muted-foreground">
              The app is rated for users 12 and older and contains mild suggestive humor. We do not knowingly
              collect any information from children of any age, because we do not collect information from
              anyone.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Changes to this policy</h2>
            <p className="text-muted-foreground">
              If this policy ever changes, the updated version will appear on this page with a new effective
              date. Material changes will also be noted in the app's release notes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Contact</h2>
            <p className="text-muted-foreground">
              Questions or concerns? Email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </article>

        <footer className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground">
          © {new Date().getFullYear()} Relationship Saver. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
