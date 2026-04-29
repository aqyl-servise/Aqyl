"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "../../lib/api";
import { useSchool } from "../../contexts/school-context";

type SchoolOption = { id: string; name: string; city?: string | null; isActive?: boolean };

export function SchoolSwitcher({ token }: { token: string }) {
  const { selectedSchoolId, selectedSchoolName, setSelectedSchool } = useSchool();
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getSchools(token).then((data) => setSchools(data)).catch(() => {});
  }, [token]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const showSearch = schools.length > 5;
  const filtered = search.trim()
    ? schools.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.city ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : schools;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", marginBottom: 6 }}>
      <button
        onClick={() => { setOpen((v) => !v); setSearch(""); }}
        title="Переключить школу"
        style={{
          display: "flex", alignItems: "center", gap: 6, width: "100%",
          padding: "7px 10px", borderRadius: 8,
          border: "1px solid var(--border, rgba(255,255,255,0.12))",
          background: "var(--surface-raised, rgba(255,255,255,0.06))",
          color: "var(--text)", cursor: "pointer", fontSize: 12, textAlign: "left",
          transition: "background 0.15s",
        }}
      >
        <span style={{ fontSize: 14 }}>🏫</span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: selectedSchoolId ? 600 : 400 }}>
          {selectedSchoolName}
        </span>
        <span style={{ opacity: 0.5, fontSize: 9, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "var(--surface, #1e1e2e)", border: "1px solid var(--border, rgba(255,255,255,0.12))",
          borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          zIndex: 300, overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          {showSearch && (
            <div style={{ padding: "8px 8px 4px", borderBottom: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
              <input
                autoFocus
                placeholder="Поиск школы..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%", padding: "5px 8px", borderRadius: 6,
                  border: "1px solid var(--border, rgba(255,255,255,0.12))",
                  background: "var(--surface-raised, rgba(255,255,255,0.06))",
                  color: "var(--text)", fontSize: 12, boxSizing: "border-box", outline: "none",
                }}
              />
            </div>
          )}
          <div style={{ overflowY: "auto", maxHeight: 260 }}>
            <button
              onClick={() => { setSelectedSchool(null, "Все школы"); setOpen(false); setSearch(""); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "9px 12px", border: "none",
                background: selectedSchoolId === null ? "var(--primary-light, rgba(99,102,241,0.12))" : "none",
                color: "var(--text)", cursor: "pointer", fontSize: 12, textAlign: "left",
                borderBottom: "1px solid var(--border, rgba(255,255,255,0.06))",
              }}
            >
              <span>🌐</span>
              <span style={{ flex: 1 }}>Все школы</span>
              {selectedSchoolId === null && <span style={{ color: "var(--primary, #6366f1)", fontWeight: 700 }}>✓</span>}
            </button>
            {filtered.map((school) => (
              <button
                key={school.id}
                onClick={() => { setSelectedSchool(school.id, school.name); setOpen(false); setSearch(""); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "9px 12px", border: "none",
                  background: selectedSchoolId === school.id ? "var(--primary-light, rgba(99,102,241,0.12))" : "none",
                  color: "var(--text)", cursor: "pointer", fontSize: 12, textAlign: "left",
                  borderBottom: "1px solid var(--border, rgba(255,255,255,0.04))",
                }}
              >
                <span>🏫</span>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                    {school.name}
                  </div>
                  {school.city && (
                    <div style={{ fontSize: 10, opacity: 0.55, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {school.city}
                    </div>
                  )}
                </div>
                {selectedSchoolId === school.id && <span style={{ color: "var(--primary, #6366f1)", fontWeight: 700, flexShrink: 0 }}>✓</span>}
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: "14px 12px", textAlign: "center", fontSize: 12, opacity: 0.5 }}>
                Ничего не найдено
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
