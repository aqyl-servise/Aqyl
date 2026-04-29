"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { setApiSchoolId } from "../lib/api";

type SchoolContextType = {
  selectedSchoolId: string | null;
  selectedSchoolName: string;
  setSelectedSchool: (id: string | null, name: string) => void;
};

const SchoolContext = createContext<SchoolContextType>({
  selectedSchoolId: null,
  selectedSchoolName: "Все школы",
  setSelectedSchool: () => {},
});

const LS_KEY = "aqyl_selected_school";

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [selectedSchoolId, setId] = useState<string | null>(null);
  const [selectedSchoolName, setName] = useState("Все школы");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const { id, name } = JSON.parse(saved) as { id: string; name: string };
        setId(id);
        setName(name || "Все школы");
        setApiSchoolId(id);
      }
    } catch {}
  }, []);

  function setSelectedSchool(id: string | null, name: string) {
    setId(id);
    setName(name);
    setApiSchoolId(id);
    try {
      if (id) localStorage.setItem(LS_KEY, JSON.stringify({ id, name }));
      else localStorage.removeItem(LS_KEY);
    } catch {}
  }

  return (
    <SchoolContext.Provider value={{ selectedSchoolId, selectedSchoolName, setSelectedSchool }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  return useContext(SchoolContext);
}
