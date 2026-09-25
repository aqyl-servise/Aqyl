import type { Metadata } from "next";
import { Landing } from "../components/landing/landing";
import { LANDING_RU } from "../lib/landing-copy";

// Канонический адрес и языковые версии — только здесь, а не в общем шаблоне:
// иначе каждая страница сайта объявила бы себя копией главной.
export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    languages: { "ru-KZ": "/", "kk-KZ": "/kz", "x-default": "/" },
  },
};

export default function LandingPage() {
  return <Landing c={LANDING_RU} />;
}
