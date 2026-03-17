import { createContext, useContext, ReactNode } from "react";

interface SoeMotorContextType {}

const SoeMotorContext = createContext<SoeMotorContextType>({});

export function SoeMotorProvider({ children }: { children: ReactNode }) {
  return (
    <SoeMotorContext.Provider value={{}}>
      {children}
    </SoeMotorContext.Provider>
  );
}

export function useSoeMotor() {
  return useContext(SoeMotorContext);
}
