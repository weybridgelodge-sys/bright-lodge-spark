// KPI dashboard / Members — primes the unit's installation rule before portal
// screens compute Masonic-year labels; reloads when the signed-in user changes.
import { useEffect, useRef, useState } from "react";
import { PageLoader } from "@/components/AppErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { loadInstallationConfig } from "@/lib/masonicYear";

export default function InstallationConfigGate({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user?.id ?? null;
  const [ready, setReady] = useState(false);
  const [, bump] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    let live = true;
    const guard = setTimeout(() => { if (live) setReady(true); }, 6000);
    loadInstallationConfig().finally(() => {
      clearTimeout(guard);
      if (!live) return;
      setReady(true);
      if (!first.current) bump((n) => n + 1);
      first.current = false;
    });
    return () => { live = false; clearTimeout(guard); };
  }, [uid]);

  if (!ready) return <PageLoader />;
  return <>{children}</>;
}
