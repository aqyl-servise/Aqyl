import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "../../components/legal-page";
import { LEGAL_DOCS } from "../../lib/legal-docs";

const doc = LEGAL_DOCS.consent;

export const metadata: Metadata = { title: `${doc.title} | Aqyl` };

export default function Page() {
  return (
    <LegalPage doc={doc}>
      {/* Якорь, на который ссылается вторая отметка на экране регистрации.
          Блок отдельный, а не заголовок внутри текста: ссылка должна вести
          к цели независимо от того, каким получится итоговый текст согласия. */}
      <section id="cross-border" style={{ scrollMarginTop: 90, marginTop: 32 }}>
        <h2 style={{ marginBottom: 12 }}>Трансграничная передача</h2>
        <p style={{ lineHeight: 1.75, marginBottom: 12 }}>
          Чтобы создать учебный материал, содержание вашего запроса — предмет, класс, тема и
          заметки — передаётся поставщику языковых моделей, расположенному за пределами
          Республики Казахстан. Имя, адрес почты, телефон и наименование школы при этом не
          передаются.
        </p>
        <p style={{ lineHeight: 1.75, marginBottom: 12 }}>
          Это согласие запрашивается <b>отдельной отметкой</b> и не связано с согласием на
          обработку персональных данных: от него можно отказаться, продолжив пользоваться
          остальными возможностями.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          Полный перечень получателей с указанием страны:{" "}
          <Link href="/privacy/recipients">кому передаются данные</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
