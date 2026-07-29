import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { registerPushNotifications, resetPushRegistration } from "@/lib/pushNotifications";

/**
 * Mounted once inside the auth provider. Registers this device for push as
 * soon as a member session exists (login, or app start when already signed in).
 * No-op on web.
 */
export default function PushRegistrar() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      resetPushRegistration();
      return;
    }
    void registerPushNotifications(user.id);
  }, [user?.id]);

  return null;
}
