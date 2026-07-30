import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/**
 * Native push-notification registration (Android via FCM, iOS via APNs).
 *
 * Behaviour:
 *  - No-op on web; runs on Android and iOS native platforms.
 *  - Asks for permission at most once per install; if the member denies it we
 *    remember that locally and never nag again (they can re-enable it from the
 *    OS settings, and a fresh install resets the flag).
 *  - On a successful FCM registration we upsert { member_id, platform, token }
 *    into push_device_tokens, keyed on (member_id, token), so re-logins and
 *    reinstalls refresh the same row rather than creating duplicates.
 */

// Legacy suppression flag — no longer used as a gate (it could persist across
// app updates and silently block registration forever). Cleared on sight.
const LEGACY_DENIED_KEY = "push_permission_denied_v1";

let registrationStarted = false;

export function isPushSupported() {
  const platform = Capacitor.getPlatform();
  return Capacitor.isNativePlatform() && (platform === "android" || platform === "ios");
}

export async function registerPushNotifications(memberId: string): Promise<void> {
  if (!isPushSupported() || !memberId) return;
  if (registrationStarted) return;
  registrationStarted = true;

  try {
    localStorage.removeItem(LEGACY_DENIED_KEY);

    // Dynamic import so the plugin is never pulled into the web bundle path.
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";

    let perm = await PushNotifications.checkPermissions();
    console.log("[push] permission state", perm.receive);

    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      // Both Android and iOS suppress their own dialog after the member has
      // answered once, so we don't need our own flag — no nagging, no lockout.
      perm = await PushNotifications.requestPermissions();
      console.log("[push] permission after request", perm.receive);
    }

    if (perm.receive !== "granted") {
      // Graceful decline: don't throw, don't retry this session.
      console.log("[push] notifications not granted — skipping registration");
      return;
    }


    await PushNotifications.removeAllListeners();

    await PushNotifications.addListener("registration", async (token) => {
      try {
        const { error } = await supabase.from("push_device_tokens").upsert(
          {
            member_id: memberId,
            platform,
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
