export default function TmpNavTest() {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-navy">
      <main className="pb-[max(5.5rem,calc(5rem+env(safe-area-inset-bottom)))] lg:pb-0">
        <p className="text-primary-foreground p-4">content</p>
      </main>
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 min-h-[4.5rem] bg-navy-dark border-t border-gold/20 flex items-stretch justify-around z-50"
        style={{ paddingTop: "0.5rem", paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {["Hub","Calendar","Directory","Profile","Ritual"].map((l) => (
          <span key={l} className="flex flex-col items-center justify-center gap-1 leading-none text-[10px] font-bold text-primary-foreground/60">
            <span className="h-5 w-5 block" />{l}
          </span>
        ))}
      </div>
    </div>
  );
}
