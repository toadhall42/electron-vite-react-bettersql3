import { create } from "zustand";
import { persist } from "zustand/middleware";

type Settings = {
  // Shows internal row IDs in every table
  debug: boolean;
  setDebug: (debug: boolean) => void;
};

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      debug: false,
      setDebug: (debug) => set({ debug }),
    }),
    { name: "settings" }
  )
);

export const useDebug = () => useSettings((s) => s.debug);
