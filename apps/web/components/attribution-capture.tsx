"use client";
import { useEffect } from "react";
import { captureAttribution } from "../lib/attribution";

/** Фиксирует источник первого касания. Ничего не рендерит. */
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
