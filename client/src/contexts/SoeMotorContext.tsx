import { createContext, useContext, useState, ReactNode } from "react";

interface SoeMotorContextValue {
  activeCompany: string | null;
  setActiveCompany: (id: string | null) => void;
}

const SoeMotorContext = createContext<SoeMotorContextValue>({
  activeCompany: null,
  setActiveCompany: () => {},
});

export function SoeMotorProvider({ children }: { children: ReactNode }) {
  const [activeCompany, setActiveCompany] = useState<string | null>(null);

  return (
    <SoeMotorContext.Provider value={{ activeCompany, setActiveCompany }}>
      {children}
    </SoeMotorContext.Provider>
  );
}

export function useSoeMotor() {
  return useContext(SoeMotorContext);
}
