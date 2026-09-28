import { LESSON_PACKAGES } from '../billing/packages';

/**
 * Тексты писем-подсказок на русском и казахском.
 *
 * Термины — по утверждённой таблице: в русском тексте «краткосрочный план
 * урока», в казахском «қысқа мерзімді сабақ жоспары». Обещаем только то, что
 * есть в продукте: «30 секунд» — про план, уроки из пакета действуют 3 месяца,
 * платёж разовый.
 */
export type MailLang = 'ru' | 'kz';

export interface NudgeMail {
  subject: string;
  html: string;
  text: string;
}

const site = () => (process.env.FRONTEND_URL ?? 'https://aqyl-service.kz').split(',')[0].trim();

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Имя для обращения — только если учитель указал одно слово. Порядок в ФИО
 * бывает любым, и «Здравствуйте, Иванова» хуже, чем обращение без имени.
 */
function firstName(fullName: string | null | undefined): string {
  const w = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return w.length === 1 && w[0].length > 1 && w[0].length < 30 ? w[0] : '';
}

function lessonsRu(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'урок';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'урока';
  return 'уроков';
}

/** «1 бесплатный урок», но «5 бесплатных уроков». */
function freeRu(n: number): string {
  return n % 10 === 1 && n % 100 !== 11 ? 'бесплатный' : 'бесплатных';
}

// Разделитель разрядов в ru-RU — неразрывный пробел (в разных ICU разный); в почте нужен обычный.
const money = (n: number) => n.toLocaleString('ru-RU').replace(/[\u00a0\u202f]/g, ' ');

function layout(lang: MailLang, body: string, unsubscribeUrl: string): string {
  const footer = lang === 'kz'
    ? `Бұл хат сіз Aqyl-ға тіркелгендіктен жіберілді. <a href="${unsubscribeUrl}" style="color:#94a3b8">Мұндай хаттардан бас тарту</a> — төлем түбіртектері мен қолжетімділік туралы хаттар келе береді.`
    : `Вы получили это письмо, потому что зарегистрировались в Aqyl. <a href="${unsubscribeUrl}" style="color:#94a3b8">Отписаться от таких писем</a> — квитанции и письма о доступе продолжат приходить.`;
  return `<!DOCTYPE html>
<html lang="${lang === 'kz' ? 'kk' : 'ru'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="padding:28px 32px 8px;font-size:22px;font-weight:700;color:#3B2E7E">Aqyl</td></tr>
<tr><td style="padding:8px 32px 28px;color:#1e293b;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #f1f5f9;color:#94a3b8;font-size:12px;line-height:1.5">${footer}</td></tr>
</table></td></tr></table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:22px 0"><tr><td style="background:#6f61d6;border-radius:8px">
<a href="${href}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">${label}</a>
</td></tr></table>`;
}

/** Зарегистрировался, но ни одного готового урока. */
export function activationMail(p: {
  lang: MailLang; fullName?: string | null; freeLessons: number; unsubscribeUrl: string;
}): NudgeMail {
  const name = firstName(p.fullName);
  const url = `${site()}/dashboard/b2c/lesson?utm_source=email&utm_medium=nudge&utm_campaign=activation`;
  const n = p.freeLessons;

  if (p.lang === 'kz') {
    const hello = name ? `Сәлеметсіз бе, ${esc(name)}!` : 'Сәлеметсіз бе!';
    const body = `<h2 style="margin:0 0 14px;font-size:20px">Алғашқы сабақ жоспары — 30 секундта</h2>
<p style="margin:0 0 12px">${hello} Сіз Aqyl-ға тіркелдіңіз, бірақ әлі бірде-бір сабақ жасаған жоқсыз. Сізде <b>${n} тегін сабақ</b> бар — олар сақтаулы.</p>
<p style="margin:0 0 12px">Пәнді, сыныпты және тақырыпты көрсетіңіз — Aqyl № 130 бұйрық нысаны бойынша қысқа мерзімді сабақ жоспарын құрастырады: мақсаттар, кезеңдер, критерийлер мен дескрипторлар. Жоспар Word-қа жүктеледі, оны әдеттегі құжат сияқты түзетуге болады.</p>
${button(url, 'Алғашқы сабақты жасау')}
<p style="margin:0;color:#475569;font-size:14px">Бірдеңе шықпаса — осы хатқа жауап жазыңыз, көмектесеміз.</p>`;
    return {
      subject: `Aqyl-да ${n} тегін сабақ сізді күтіп тұр`,
      html: layout('kz', body, p.unsubscribeUrl),
      text: `${hello} Сіз Aqyl-ға тіркелдіңіз, бірақ әлі бірде-бір сабақ жасаған жоқсыз. Сізде ${n} тегін сабақ бар.\n\n` +
        `Пәнді, сыныпты және тақырыпты көрсетіңіз — Aqyl № 130 бұйрық нысаны бойынша қысқа мерзімді сабақ жоспарын құрастырады.\n\n` +
        `Алғашқы сабақты жасау: ${url}\n\nМұндай хаттардан бас тарту: ${p.unsubscribeUrl}`,
    };
  }

  const hello = name ? `Здравствуйте, ${esc(name)}!` : 'Здравствуйте!';
  const body = `<h2 style="margin:0 0 14px;font-size:20px">Первый план урока — за 30 секунд</h2>
<p style="margin:0 0 12px">${hello} Вы зарегистрировались в Aqyl, но ещё не сделали ни одного урока. У вас <b>${n} ${freeRu(n)} ${lessonsRu(n)}</b> — они никуда не делись.</p>
<p style="margin:0 0 12px">Укажите предмет, класс и тему — Aqyl соберёт краткосрочный план урока по форме приказа № 130: цели, этапы, критерии и дескрипторы. План скачивается в Word, его можно поправить как обычный документ.</p>
${button(url, 'Сделать первый урок')}
<p style="margin:0;color:#475569;font-size:14px">Если что-то не получилось — ответьте на это письмо, поможем разобраться.</p>`;
  return {
    subject: `${n} ${freeRu(n)} ${lessonsRu(n)} ждут вас в Aqyl`,
    html: layout('ru', body, p.unsubscribeUrl),
    text: `${hello} Вы зарегистрировались в Aqyl, но ещё не сделали ни одного урока. У вас ${n} ${freeRu(n)} ${lessonsRu(n)}.\n\n` +
      `Укажите предмет, класс и тему — Aqyl соберёт краткосрочный план урока по форме приказа № 130.\n\n` +
      `Сделать первый урок: ${url}\n\nОтписаться от таких писем: ${p.unsubscribeUrl}`,
  };
}

/** Бесплатные уроки израсходованы, покупки не было. */
export function trialEndMail(p: {
  lang: MailLang; fullName?: string | null; lessonsMade: number; unsubscribeUrl: string;
}): NudgeMail {
  const name = firstName(p.fullName);
  const url = `${site()}/dashboard/b2c/subscribe?utm_source=email&utm_medium=nudge&utm_campaign=trial_end`;
  const pkgs = LESSON_PACKAGES.filter((x) => !x.upsellOnly);
  const n = p.lessonsMade;

  if (p.lang === 'kz') {
    const hello = name ? `Сәлеметсіз бе, ${esc(name)}!` : 'Сәлеметсіз бе!';
    const rows = pkgs.map((x) => `<li>${x.lessons} сабақ — <b>${money(x.priceKzt)} ₸</b> (сабағы ${money(Math.round(x.priceKzt / x.lessons))} ₸)</li>`).join('');
    const body = `<h2 style="margin:0 0 14px;font-size:20px">Тегін сабақтар аяқталды</h2>
<p style="margin:0 0 12px">${hello} Сіз Aqyl-да ${n} сабақ жасадыңыз — барлық тегін сабақтар пайдаланылды. Жасалған жоспарлар сізде қалады: оларды кез келген уақытта ашып, жүктеп алуға болады.</p>
<p style="margin:0 0 6px">Жалғастыру үшін пакет таңдаңыз:</p>
<ul style="margin:0 0 12px;padding-left:20px">${rows}</ul>
<p style="margin:0 0 12px;color:#475569;font-size:14px">Пакеттегі сабақтар 3 ай жарамды, әр сатып алу бүкіл балансты ұзартады. Төлем бір реттік — ақша автоматты түрде алынбайды.</p>
${button(url, 'Пакет таңдау')}`;
    return {
      subject: 'Aqyl-дағы тегін сабақтар аяқталды',
      html: layout('kz', body, p.unsubscribeUrl),
      text: `${hello} Сіз Aqyl-да ${n} сабақ жасадыңыз — барлық тегін сабақтар пайдаланылды.\n\n` +
        pkgs.map((x) => `${x.lessons} сабақ — ${money(x.priceKzt)} ₸`).join('\n') +
        `\n\nПакеттегі сабақтар 3 ай жарамды. Төлем бір реттік.\n\nПакет таңдау: ${url}\n\nМұндай хаттардан бас тарту: ${p.unsubscribeUrl}`,
    };
  }

  const hello = name ? `Здравствуйте, ${esc(name)}!` : 'Здравствуйте!';
  const rows = pkgs.map((x) => `<li>${x.lessons} ${lessonsRu(x.lessons)} — <b>${money(x.priceKzt)} ₸</b> (${money(Math.round(x.priceKzt / x.lessons))} ₸ за урок)</li>`).join('');
  const body = `<h2 style="margin:0 0 14px;font-size:20px">Бесплатные уроки закончились</h2>
<p style="margin:0 0 12px">${hello} Вы сделали в Aqyl ${n} ${lessonsRu(n)} — все бесплатные использованы. Созданные планы остаются у вас: их можно открыть и скачать в любое время.</p>
<p style="margin:0 0 6px">Чтобы продолжить, выберите пакет:</p>
<ul style="margin:0 0 12px;padding-left:20px">${rows}</ul>
<p style="margin:0 0 12px;color:#475569;font-size:14px">Уроки из пакета действуют 3 месяца, каждая покупка продлевает весь баланс. Платёж разовый — автоматических списаний нет.</p>
${button(url, 'Выбрать пакет')}`;
  return {
    subject: 'Бесплатные уроки в Aqyl закончились',
    html: layout('ru', body, p.unsubscribeUrl),
    text: `${hello} Вы сделали в Aqyl ${n} ${lessonsRu(n)} — все бесплатные использованы.\n\n` +
      pkgs.map((x) => `${x.lessons} ${lessonsRu(x.lessons)} — ${money(x.priceKzt)} ₸`).join('\n') +
      `\n\nУроки из пакета действуют 3 месяца. Платёж разовый.\n\nВыбрать пакет: ${url}\n\nОтписаться от таких писем: ${p.unsubscribeUrl}`,
  };
}
