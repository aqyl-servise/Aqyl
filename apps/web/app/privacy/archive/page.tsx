import type { Metadata } from "next";
import { LegalArchive } from "../../../components/legal-archive";
import { LEGAL_DOCS } from "../../../lib/legal-docs";

const doc = LEGAL_DOCS.privacy;

export const metadata: Metadata = { title: `Предыдущие редакции — ${doc.title} | Aqyl` };

export default function Page() {
  return <LegalArchive doc={doc} />;
}
