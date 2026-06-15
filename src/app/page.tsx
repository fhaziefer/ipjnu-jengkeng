"use client";

import { useGameStore } from "@/store/useGameStore";
import SetupScreen from "@/components/SetupScreen";
import DashboardScreen from "@/components/DashboardScreen";
import FinishedScreen from "@/components/FinishedScreen";
import InstallPrompt from "@/components/InstallPrompt";
import SplashScreen from "@/components/SplashScreen";
import { useEffect, useState } from "react";

export default function Home() {
  const { gameStatus } = useGameStore();

  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    setMounted(true);

    const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");

    if (hasSeenSplash) {
      setShowSplash(false);
      return;
    }

    const splashTimer = window.setTimeout(() => {
      sessionStorage.setItem("hasSeenSplash", "true");
      setShowSplash(false);
    }, 3000);

    return () => {
      window.clearTimeout(splashTimer);
    };
  }, []);

  if (!mounted || showSplash) {
    return <SplashScreen />;
  }

  return (
    <>
      {gameStatus === "idle" && <SetupScreen />}
      {gameStatus === "active" && <DashboardScreen />}
      {gameStatus === "finished" && <FinishedScreen />}

      {/* Pop Up akan nangkring otomatis di bawah */}
      <InstallPrompt />
    </>
  );
}