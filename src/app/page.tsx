"use client";

import { useGameStore } from "@/store/useGameStore";
import SetupScreen from "@/components/SetupScreen";
import DashboardScreen from "@/components/DashboardScreen";
import FinishedScreen from "@/components/FinishedScreen";
import InstallPrompt from "@/components/InstallPrompt";
import { useEffect, useState } from "react";

export default function Home() {
  const { gameStatus } = useGameStore();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration errors with persist middleware
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

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