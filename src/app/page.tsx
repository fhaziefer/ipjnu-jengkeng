import { useState, useEffect } from "react";

export function useNow(updateIntervalMs = 1000) {
  // FIX BUG 4: Inisiasi state dengan 0 biar seragam pas Server-Side Rendering (SSR)
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    // Update dengan waktu sebenarnya setelah komponen di-mount di browser
    setNow(Date.now());
    
    const interval = setInterval(() => {
      setNow(Date.now());
    }, updateIntervalMs);

    return () => clearInterval(interval);
  }, [updateIntervalMs]);

  // Fallback aman: kalau masih 0 (belum mount) return Date.now() biar hitungan nggak error
  return now === 0 ? Date.now() : now; 
}