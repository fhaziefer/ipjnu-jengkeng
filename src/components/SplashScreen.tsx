export default function SplashScreen() {
    const year = new Date().getFullYear();

    return (
        <div className="fixed inset-0 z-9999 flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-6 text-center">

            <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
                <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-2xl border border-accent/20 bg-surface/70">
                    <img
                        src="/icon.svg"
                        alt="Jengkeng Logo"
                        className="h-16 w-16 object-contain"
                    />
                </div>

                <h1 className="text-4xl font-black tracking-tighter text-accent">
                    JENGKENG
                </h1>

                <p className="mt-2 text-sm text-fg-subtle">
                    Digawe ngitung, ben gak mumet
                </p>

                <div className="mt-8 flex items-center justify-center gap-2">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
                </div>
            </div>

            <div className="relative z-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-xs font-medium tracking-widest text-fg-subtle">
                IPJNU @{year}
            </div>
        </div>
    );
}