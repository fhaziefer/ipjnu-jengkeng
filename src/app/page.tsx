"use client";

import { useGameStore } from "@/store/useGameStore";
import SetupScreen from "@/components/SetupScreen";
import DashboardScreen from "@/components/DashboardScreen";
import FinishedScreen from "@/components/FinishedScreen";
import { useEffect, useState } from "react";

export default function Home() {
  const { gameStatus } = useGameStore();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration errors with persist middleware
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (gameStatus === "idle") {
    return <SetupScreen />;
  }

  if (gameStatus === "active") {
    return <DashboardScreen />;
  }

  if (gameStatus === "finished") {
    return <FinishedScreen />;
  }

  return null;
}
