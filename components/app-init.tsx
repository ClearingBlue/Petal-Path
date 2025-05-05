"use client";

import { useEffect } from "react";
import { initDataIfNeeded } from "@/lib/data/init-data";

export function AppInitializer() {
  useEffect(() => {
    // Initialize app data on client-side
    initDataIfNeeded();
  }, []);

  // This component doesn't render anything
  return null;
} 