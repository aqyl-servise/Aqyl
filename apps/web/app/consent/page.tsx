import type { Metadata } from "next";
import { LegalPage } from "../../components/legal-page";
import { LEGAL_DOCS } from "../../lib/legal-docs";

const doc = LEGAL_DOCS.consent;

export const metadata: Metadata = { title: `${doc.title} | Aqyl` };

export default function Page() {
  return <LegalPage doc={doc} />;
}
