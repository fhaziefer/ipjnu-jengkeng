export default function SplashScreen() {
    const year = new Date().getFullYear();

    return (
        <div className="fixed inset-0 z-9999 flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-zinc-950 px-6 text-center">
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-500/20 blur-[90px]" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-rose-500/20 blur-[90px]" />

            <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
                <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-3xl border border-amber-500/20 bg-zinc-900/70 shadow-2xl shadow-amber-500/10">
                    <img
                        src="/icon.svg"
                        alt="Jengkeng Logo"
                        className="h-16 w-16 object-contain"
                    />
                </div>

                <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-br from-amber-400 to-rose-500">
                    JENGKENG
                </h1>

                <p className="mt-2 text-sm text-zinc-500">
                    Digawe ngitung, ben gak mumet
                </p>

                <div className="mt-8 flex items-center justify-center gap-2">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-amber-500 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-amber-500 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-amber-500" />
                </div>
            </div>

            <div className="relative z-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-xs font-medium tracking-widest text-zinc-600">
                IPJNU @{year}
            </div>
        </div>
    );
}