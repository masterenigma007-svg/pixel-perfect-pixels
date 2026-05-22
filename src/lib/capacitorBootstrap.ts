// Native runtime bootstrap: status bar + splash screen.
// Safe to call in the browser — every call is guarded by Capacitor.isNativePlatform().
import { Capacitor } from "@capacitor/core";

export async function bootstrapNative() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // Do NOT overlay the web view — this fixes content sitting under the status bar.
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: "#1a1330" });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch (e) {
    console.warn("StatusBar setup failed", e);
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    // The splash is shown by the native launch theme; hide it once React has mounted.
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (e) {
    console.warn("SplashScreen hide failed", e);
  }
}
