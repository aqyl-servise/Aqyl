/**
 * Тесты логики доступа и списания пакетов (ТЗ №3, п. 11.1). node:test +
 * ручные моки репозиториев — jest в проекте не установлен.
 *
 * Мок повторяет контракт настоящего списания: UPDATE платного баланса
 * срабатывает только при balance > 0 и живом сроке (условие в WHERE), что и
 * защищает от гонок в бою.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SubscriptionService } from './subscription.service';
import { BillingService } from './billing.service';

interface World {
  teacher: {
    id: string; registrationSource: string;
    paidLessonsBalance: number; balanceExpiresAt: Date | null;
  };
  lessons: Map<string, { userId: string; trialCounted: boolean; paidCounted: boolean }>;
  subscriptionActive: boolean;
  purchases: any[];
}

function makeService(w: World): SubscriptionService {
  const teacherRepo = {
    findOne: async () => ({ ...w.teacher }),
    createQueryBuilder: () => {
      const qb: any = {
        _set: null as any,
        update: () => qb,
        set: (s: any) => ((qb._set = s), qb),
        where: (_c: string, _p: any) => qb,
        execute: async () => {
          // Начисление: expiresAt в set — безусловный UPDATE.
          if (qb._set?.balanceExpiresAt) {
            const add = Number(String(qb._set.paidLessonsBalance()).match(/\+ (\d+)/)?.[1] ?? 0);
            w.teacher.paidLessonsBalance += add;
            w.teacher.balanceExpiresAt = qb._set.balanceExpiresAt;
            return { affected: 1 };
          }
          // Списание: контракт WHERE — баланс > 0 и срок живой.
          const ok = w.teacher.paidLessonsBalance > 0 &&
            !!w.teacher.balanceExpiresAt && w.teacher.balanceExpiresAt > new Date();
          if (ok) w.teacher.paidLessonsBalance -= 1;
          return { affected: ok ? 1 : 0 };
        },
      };
      return qb;
    },
  };
  const lessonRepo = {
    count: async (opts: any) => {
      const wh = Array.isArray(opts.where) ? opts.where : [opts.where];
      let n = 0;
      for (const l of w.lessons.values()) {
        for (const c of wh) {
          if (c.userId !== l.userId) continue;
          if (c.id && !w.lessons.has(c.id)) continue;
          if (c.trialCounted !== undefined && l.trialCounted !== c.trialCounted) continue;
          if (c.paidCounted !== undefined && l.paidCounted !== c.paidCounted) continue;
          if (c.id && w.lessons.get(c.id) !== l) continue;
          n++; break;
        }
      }
      return n;
    },
    findOne: async (opts: any) => {
      const l = w.lessons.get(opts.where.id);
      return l && l.userId === opts.where.userId ? { ...l } : null;
    },
    update: async (crit: any, patch: any) => {
      const l = w.lessons.get(crit.id);
      if (l) Object.assign(l, patch);
      return { affected: l ? 1 : 0 };
    },
  };
  const purchaseRepo = {
    create: (x: any) => x,
    save: async (x: any) => (w.purchases.push(x), x),
  };
  // Начисление проверяем НАСТОЯЩИМ BillingService.creditPackage поверх тех же
  // моков репозиториев; не задействованные в нём зависимости — заглушки.
  const billingReal = new BillingService(
    null as any, null as any, teacherRepo as any, purchaseRepo as any,
    {} as any, { get: () => '' } as any, {} as any,
  );
  const billing = {
    getSubscription: async () =>
      w.subscriptionActive
        ? { status: 'active', currentPeriodEnd: new Date(Date.now() + 86400e3) }
        : null,
    creditPackage: billingReal.creditPackage.bind(billingReal),
  };
  return new SubscriptionService(billing as any, teacherRepo as any, lessonRepo as any);
}

const T = 't-1';
function world(over: Partial<World['teacher']> = {}, opts: Partial<World> = {}): World {
  return {
    teacher: {
      id: T, registrationSource: 'b2c',
      paidLessonsBalance: 0, balanceExpiresAt: null, ...over,
    },
    lessons: new Map(),
    subscriptionActive: false,
    purchases: [],
    ...opts,
  };
}
const lesson = (w: World, id: string, flags: Partial<{ trialCounted: boolean; paidCounted: boolean }> = {}) =>
  w.lessons.set(id, { userId: T, trialCounted: false, paidCounted: false, ...flags });

const future = () => new Date(Date.now() + 30 * 86400e3);
const past = () => new Date(Date.now() - 86400e3);

// ── порядок списания ──────────────────────────────────────────────────────
test('подписка активна: доступ есть, ничего не списывается', async () => {
  const w = world({ paidLessonsBalance: 3, balanceExpiresAt: future() }, { subscriptionActive: true });
  lesson(w, 'l1');
  const svc = makeService(w);
  assert.equal(await svc.chargeLessonStart(T, 'l1'), 'none');
  assert.equal(w.teacher.paidLessonsBalance, 3);
  assert.equal(w.lessons.get('l1')!.trialCounted, false);
});

test('триал списывается раньше платного баланса', async () => {
  const w = world({ paidLessonsBalance: 10, balanceExpiresAt: future() });
  lesson(w, 'l1');
  const svc = makeService(w);
  assert.equal(await svc.chargeLessonStart(T, 'l1'), 'trial');
  assert.equal(w.teacher.paidLessonsBalance, 10, 'платный баланс не тронут');
  assert.equal(w.lessons.get('l1')!.trialCounted, true);
});

test('после исчерпания триала списывается платный', async () => {
  const w = world({ paidLessonsBalance: 2, balanceExpiresAt: future() });
  for (let i = 0; i < 5; i++) lesson(w, `old${i}`, { trialCounted: true });
  lesson(w, 'l1');
  const svc = makeService(w);
  assert.equal(await svc.chargeLessonStart(T, 'l1'), 'paid');
  assert.equal(w.teacher.paidLessonsBalance, 1);
  assert.equal(w.lessons.get('l1')!.paidCounted, true);
});

test('идемпотентность: списанный урок не списывается повторно', async () => {
  const w = world({ paidLessonsBalance: 2, balanceExpiresAt: future() });
  for (let i = 0; i < 5; i++) lesson(w, `old${i}`, { trialCounted: true });
  lesson(w, 'l1', { paidCounted: true });
  const svc = makeService(w);
  assert.equal(await svc.chargeLessonStart(T, 'l1'), 'paid');
  assert.equal(w.teacher.paidLessonsBalance, 2, 'баланс не изменился');
});

test('нет триала и баланса — 403', async () => {
  const w = world();
  for (let i = 0; i < 5; i++) lesson(w, `old${i}`, { trialCounted: true });
  lesson(w, 'l1');
  const svc = makeService(w);
  await assert.rejects(() => svc.chargeLessonStart(T, 'l1'), /Уроки закончились/);
});

test('срок истёк: 403 с текстом про срок, баланс не уходит в минус', async () => {
  const w = world({ paidLessonsBalance: 7, balanceExpiresAt: past() });
  for (let i = 0; i < 5; i++) lesson(w, `old${i}`, { trialCounted: true });
  lesson(w, 'l1');
  const svc = makeService(w);
  await assert.rejects(() => svc.chargeLessonStart(T, 'l1'), /Срок пакета истёк/);
  assert.equal(w.teacher.paidLessonsBalance, 7);
});

test('B2G: no-op без списаний', async () => {
  const w = world({ registrationSource: 'school' });
  lesson(w, 'l1');
  const svc = makeService(w);
  assert.equal(await svc.chargeLessonStart(T, 'l1'), 'none');
  assert.equal(w.lessons.get('l1')!.trialCounted, false);
});

// ── гонка ────────────────────────────────────────────────────────────────
test('гонка: два платных списания при балансе 1 — второе получает 403', async () => {
  const w = world({ paidLessonsBalance: 1, balanceExpiresAt: future() });
  for (let i = 0; i < 5; i++) lesson(w, `old${i}`, { trialCounted: true });
  lesson(w, 'a'); lesson(w, 'b');
  const svc = makeService(w);
  const results = await Promise.allSettled([
    svc.chargeLessonStart(T, 'a'),
    svc.chargeLessonStart(T, 'b'),
  ]);
  const ok = results.filter((r) => r.status === 'fulfilled').length;
  assert.equal(ok, 1, 'ровно одно списание прошло');
  assert.equal(w.teacher.paidLessonsBalance, 0, 'баланс не ушёл в минус');
});

// ── доступ без списания (гард) ───────────────────────────────────────────
test('списанный урок доступен после обнуления баланса', async () => {
  const w = world({ paidLessonsBalance: 0, balanceExpiresAt: past() });
  for (let i = 0; i < 5; i++) lesson(w, `old${i}`, { trialCounted: true });
  // id обязан быть настоящим uuid: сервис отсекает не-uuid до запроса (22P02).
  const MINE = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
  lesson(w, MINE, { paidCounted: true });
  const svc = makeService(w);
  assert.equal(await svc.checkSubscriptionAccess(T, MINE), true);
  assert.equal(await svc.checkSubscriptionAccess(T, null), false);
});

// ── начисление ───────────────────────────────────────────────────────────
test('creditPackage: баланс растёт, срок = +3 мес, журнал пишется', async () => {
  const w = world({ paidLessonsBalance: 4, balanceExpiresAt: past() });
  const svc = makeService(w);
  const r = await svc.creditPackage(T, { code: 'p10', lessons: 10, priceKzt: 3990 }, 'pay-1');
  assert.equal(w.teacher.paidLessonsBalance, 14, 'остаток перенёсся: 4 + 10');
  assert.ok(r.expiresAt > new Date(Date.now() + 80 * 86400e3), 'срок ~3 месяца');
  assert.equal(w.purchases.length, 1);
  assert.equal(w.purchases[0].balanceAfter, 14);
});

// ── сводка для фронта ────────────────────────────────────────────────────
test('balanceSummary: истёкший баланс показывается нулём', async () => {
  const w = world({ paidLessonsBalance: 9, balanceExpiresAt: past() });
  const svc = makeService(w);
  const s = await svc.balanceSummary(T);
  assert.equal(s.paidBalance, 0);
  assert.equal(s.expiresAt, null);
  assert.equal(s.total, s.trialLeft);
});
