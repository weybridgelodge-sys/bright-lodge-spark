import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/**
 * Native push-notification registration (Android for now; iOS uses the same
 * plugin API and can be enabled later once APNs entitlements are wired up).
 *
 * Behaviour:
 *  - No-op on web and on non-Android native platforms.
 *  - Asks for permission at most once per install; if the member denies it we
 *    remember that locally and never nag again (they can re-enable it from the
 *    OS settings, and a fresh install resets the flag).
 *  - On a successful FCM registration we upsert { member_id, platform, token }
 *    into push_device_tokens, keyed on (member_id, token), so re-logins and
 *    reinstalls refresh the same row rather than creating duplicates.
 */

const DENIED_KEY = "push_permission_denied_v1";

let registrationStarted = false;

export function isPushSupported() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function registerPushNotifications(memberId: string): Promise<void> {
  if (!isPushSupported() || !memberId) return;
  if (registrationStarted) return;
  registrationStarted = true;

  try {
    // Dynamic import so the plugin is never pulled into the web bundle path.
    const { PushNotifications } = await import("@capacitor/push-notifications");

    let perm = await PushNotifications.checkPermissions();

    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      // Only prompt if we've not already been turned down on this device.
      if (localStorage.getItem(DENIED_KEY) === "1") return;
      perm = await PushNotifications.requestPermissions();
    }

    if (perm.receive !== "granted") {
      // Graceful decline: remember it, don't prompt again, don't throw.
      localStorage.setItem(DENIED_KEY, "1");
      return;
    }

    localStorage.removeItem(DENIED_KEY);

    await PushNotifications.removeAllListeners();

    await PushNotifications.addListener("registration", async (token) => {
      try {
        const { error } = await supabase.from("push_device_tokens").upsert(
          {
            member_id: memberId,
            platform: "android",
            token: token.value,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "member_id,token" }
        );
        if (error) {
          console.warn("[push] failed to store device token", error.message, error.details);
        } else {
          console.log("[push] device token stored");
        }
      } catch (err) {
        console.warn("[push] failed to store device token", err);
      }
    });

    await PushNotifications.addListener("registrationError", (err) => {
      console.warn("[push] registration error", err);
    });

    await PushNotifications.register();
  } catch (err) {
    // Never let push setup break app start-up.
    console.warn("[push] setup skipped", err);
    registrationStarted = false;
  }
}

/** Called on sign-out so the next member on this device registers cleanly. */
export function resetPushRegistration() {
  registrationStarted = false;
}
