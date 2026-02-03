// context/LoaderContext.tsx
"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import GlobalLoader from "@/components/ui/GlobalLoader";

type LoaderContextType = {
  isLoading: boolean;
  showLoader: () => void;
  hideLoader: () => void;
};

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export function LoaderProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  const showLoader = () => setIsLoading(true);
  const hideLoader = () => setIsLoading(false);

  return (
    <LoaderContext.Provider value={{ isLoading, showLoader, hideLoader }}>
      {isLoading && <GlobalLoader />} {/* Se muestra si isLoading es true */}
      {children}
    </LoaderContext.Provider>
  );
}

export const useLoader = () => {
  const context = useContext(LoaderContext);
  if (!context) throw new Error("useLoader debe usarse dentro de LoaderProvider");
  return context;
};