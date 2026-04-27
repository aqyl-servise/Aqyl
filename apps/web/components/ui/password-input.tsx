"use client";
import { ChangeEvent, useState } from "react";

function EyeOpen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

interface PasswordInputProps {
  name?: string;
  id?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function PasswordInput({ name, id, required, minLength, placeholder, autoFocus, value, defaultValue, onChange }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const controlled = value !== undefined;

  return (
    <div style={{ position: "relative" }}>
      <input
        name={name}
        id={id}
        type={show ? "text" : "password"}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        autoFocus={autoFocus}
        {...(controlled ? { value, onChange } : { defaultValue })}
        className="input"
        style={{ paddingRight: 42 }}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={show ? "Скрыть пароль" : "Показать пароль"}
        className="pwd-eye-btn"
        onClick={() => setShow((v) => !v)}
      >
        {show ? <EyeOff /> : <EyeOpen />}
      </button>
    </div>
  );
}
