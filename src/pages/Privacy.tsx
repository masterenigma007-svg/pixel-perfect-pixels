import { Link } from "react-router-dom";
import { useEffect } from "react";

const EFFECTIVE_DATE = "November 7, 2026";
const CONTACT_EMAIL = "masterenigma007@gmail.com";

export default function Privacy() {
  useEffect(() => {
    document.title = "Privacy Policy — Relationship Saver";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute(
        "content",
        "Privacy policy for Relationship Saver: learn how local app features, ads, purchases, and speech services handle data."
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
              Translation and game progress are primarily kept on your device.
              The mobile app includes the Google Mobile Ads SDK, an optional Google Play
              purchase to remove ads, and operating-system speech services. These third
              parties may process certain technical data as described below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Data and third-party services</h2>
            <p className="text-muted-foreground mb-2">
              The app does not ask you to register an account. Google Mobile Ads may process
              IP addresses, ad or device identifiers, interactions, and diagnostics for ads,
              measurement, and fraud prevention, including when test ads are enabled.
              Google Play handles payments and provides purchase status to this app.
              We do not receive your full payment-card details.
            </p>
            <p className="text-muted-foreground">
              Microphone access is optional. Speech recognition and voice synthesis may
              be provided by your device's operating system or its chosen speech provider.
              Review your device and Google privacy settings to control those services.
            </p>
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
              This describes app feature storage; third-party services may separately process data as described above.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Microphone &amp; speech</h2>
            <p className="text-muted-foreground">
              If you tap the microphone icon, the app uses a speech-recognition service
              supplied by your device or browser. Speech processing may be on-device or
              cloud-based depending on the provider and your settings. The app does not
              intentionally maintain an audio-recordings library. Spoken replies use your
              device's speech-synthesis service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Third parties</h2>
            <p className="text-muted-foreground">
              The app includes Google Mobile Ads and Google Play Billing on Android. Google
              Fonts may receive normal request information such as your IP address when fonts
              are loaded. For details, review Google's privacy policies and the permissions
              shown on your device.
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
