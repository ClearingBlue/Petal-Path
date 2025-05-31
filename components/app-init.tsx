"use client";

import { useEffect } from "react";
// import { initDataIfNeeded } from "@/lib/data/init-data";

export function AppInitializer() {
  useEffect(() => {
    // No longer needed - we're using Supabase for data
    // initDataIfNeeded();
  }, []);

  // This component doesn't render anything
  return null;
} 