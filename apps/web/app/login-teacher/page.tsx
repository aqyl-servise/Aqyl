"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Единый вход теперь живёт на /login. Этот маршрут оставлен ради старых ссылок/закладок.
export default function LoginTeacherPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/login"); }, [router]);
  return null;
}
