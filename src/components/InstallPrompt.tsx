"use client";

import { useState, useEffect } from "react";
import { Share, PlusSquare, X } from "lucide-react";

export default function InstallPrompt() {
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(true); // Default true biar gak kedip
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Cek apakah user udah pernah nutup pop-up ini biar gak ganggu terus
        const hasDismissed = localStorage.getItem("dismissedInstallPrompt");

        // Deteksi apakah sudah berjalan sebagai PWA (di Home Screen)
        const isStandAloneMatch = window.matchMedia("(display-mode: standalone)").matches;
        // @ts-expect-error - Deteksi khusus iOS Safari jadul
        const isIOSStandalone = window.navigator.standalone === true;
        const currentlyStandalone = isStandAloneMatch || isIOSStandalone;

        setIsStandalone(currentlyStandalone);

        // Deteksi OS untuk nyesuain instruksi
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isDeviceIOS = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isDeviceIOS);

        // Kalau belum di-install dan belum pernah di-dismiss, munculin!
        if (!currentlyStandalone && !hasDismissed) {
            // Kasih jeda dikit biar animasinya mulus pas pertama buka
            setTimeout(() => setShowPrompt(true), 1500);
        }
    }, []);

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem("dismissedInstallPrompt", "true");
    };

    if (!showPrompt || isStandalone) return null;

    return (
        <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm sm:max-w-md px-4">
            <div className="bg-surface border border-accent/30 rounded-2xl p-5 flex flex-col gap-3 relative">
                <button
                    onClick={handleDismiss}
                    aria-label="Tutup"
                    className="absolute top-3 right-3 p-1 bg-surface-2 rounded-full text-fg-muted hover:text-fg transition-colors before:absolute before:-inset-3 before:content-['']"
                >
                    <X className="w-4 h-4" />
                </button>

                <h3 className="font-bold text-fg text-lg pr-6">Buka tanpo rikuh!</h3>
                <p className="text-sm text-fg-muted">
                    Ben ngitunge penak, install aplikasi iki nang Home Screen HP mu.
                </p>

                {isIOS ? (
                    <div className="bg-bg rounded-xl p-3 text-sm flex flex-col gap-2 text-fg-soft mt-1 border border-line">
                        <div className="flex items-center gap-2">
                            <span>1. Pencet ikon</span>
                            <Share className="w-4 h-4 text-accent" />
                            <span>nang menu.</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>2. Pilih</span>
                            <strong className="text-fg">Add to Home Screen</strong>
                            <PlusSquare className="w-4 h-4 text-fg-muted" />
                        </div>
                    </div>
                ) : (
                    <div className="bg-bg rounded-xl p-3 text-sm text-fg-soft mt-1 border border-line leading-relaxed">
                        Pencet menu titik telu (⋮) nang pojok nduwur browser, terus pilih <strong className="text-fg">Add to Home screen</strong> atau <strong className="text-fg">Install app</strong>.
                    </div>
                )}
            </div>
        </div>
    );
}