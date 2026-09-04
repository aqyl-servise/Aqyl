import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomUUID, timingSafeEqual } from "crypto";
import { RedisService } from "./redis.service";
import {
  generateSessionCode, normalizeSessionCode, isValidSessionCode,
  cleanPlayerName, isNameTaken, MAX_NAME_LENGTH,
} from "./session-code";

export type SessionMode = "sync" | "async";
export type SessionStatus = "lobby" | "running" | "finished";

export interface SessionState {
  code: string;
  quizId: string;
  teacherId: string;
  mode: SessionMode;
  status: SessionStatus;
  /** Номер текущего вопроса в синхронном режиме, -1 пока не начали. */
  currentIndex: number;
  createdAt: number;
}

/**
 * Сессия вместе с ключом ведущего. Ключ выдаётся ровно один раз — учителю,
 * создавшему сессию. Без него любой ученик, знающий код, мог бы переключать
 * вопросы и завершать квиз: код знает весь класс, это не секрет.
 */
export interface SessionWithHostKey extends SessionState {
  hostKey: string;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  joinedAt: number;
}

/**
 * Живут не дольше учебного дня. Персональные данные не храним (ТЗ 3.0, п. 0),
 * а временные имена обязаны исчезнуть сами, даже если сессию не закрыли.
 */
const TTL_SECONDS = 6 * 60 * 60;

/** До 30 участников (ТЗ 3.0, п. 0). Предел проверяем, а не надеемся на него. */
export const MAX_PLAYERS = 30;

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly redis: RedisService) {}

  private key(code: string) { return `qs:${code}`; }
  private playersKey(code: string) { return `qs:${code}:players`; }

  /**
   * Создать сессию. Код проверяем на занятость: при 31^6 сочетаний совпадение
   * маловероятно, но «маловероятно» и «невозможно» — разные вещи, а совпавший
   * код увёл бы половину класса в чужой урок.
   */
  async create(params: { quizId: string; teacherId: string; mode: SessionMode }): Promise<SessionWithHostKey> {
    let code = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateSessionCode();
      // hsetnx записывает поле, только если его ещё нет, — проверка и захват
      // одной операцией. Через «сначала посмотреть, потом записать» два
      // учителя, нажавшие «Запустить» одновременно, могли бы получить один
      // код, и половина класса ушла бы в чужой урок.
      const claimed = await this.redis.client.hsetnx(this.key(candidate), "code", candidate);
      if (claimed === 1) {
        // Срок жизни ставим сразу: если процесс упадёт между захватом и
        // записью остальных полей, код останется занятым навсегда, а память
        // Redis у нас ограничена.
        await this.redis.client.expire(this.key(candidate), TTL_SECONDS);
        code = candidate;
        break;
      }
    }
    if (!code) throw new Error("Не удалось подобрать свободный код сессии");

    const state: SessionState = {
      code,
      quizId: params.quizId,
      teacherId: params.teacherId,
      mode: params.mode,
      status: "lobby",
      currentIndex: -1,
      createdAt: Date.now(),
    };

    const hostKey = randomUUID();
    await this.redis.client
      .multi()
      .hset(this.key(code), { ...this.flatten(state), hostKey })
      .expire(this.key(code), TTL_SECONDS)
      .exec();

    this.logger.log(`Сессия ${code} создана (квиз ${params.quizId}, режим ${params.mode})`);
    return { ...state, hostKey };
  }

  async get(rawCode: string): Promise<SessionState | null> {
    const code = normalizeSessionCode(rawCode);
    if (!isValidSessionCode(code)) return null;

    const raw = await this.redis.client.hgetall(this.key(code));
    if (!raw || !raw.code) return null;

    return {
      code: raw.code,
      quizId: raw.quizId,
      teacherId: raw.teacherId,
      mode: raw.mode as SessionMode,
      status: raw.status as SessionStatus,
      currentIndex: Number(raw.currentIndex),
      createdAt: Number(raw.createdAt),
    };
  }

  async require(rawCode: string): Promise<SessionState> {
    const state = await this.get(rawCode);
    if (!state) throw new NotFoundException("Сессия не найдена. Проверьте код");
    return state;
  }

  /**
   * Вход ученика. Возвращает участника; при повторном входе с тем же
   * playerId — восстанавливает прежнее место со счётом (ТЗ 3.0, п. 2.4).
   */
  async join(
    rawCode: string,
    rawName: string,
    knownPlayerId?: string | null,
  ): Promise<{ session: SessionState; player: Player; restored: boolean }> {
    const session = await this.require(rawCode);
    const players = await this.players(session.code);

    // Переподключение: тот же ученик после обрыва связи.
    if (knownPlayerId) {
      const existing = players.find((p) => p.id === knownPlayerId);
      if (existing) {
        existing.connected = true;
        await this.savePlayer(session.code, existing);
        return { session, player: existing, restored: true };
      }
    }

    if (session.status === "finished") {
      throw new BadRequestException("Квиз уже завершён");
    }
    // В синхронном режиме опоздавшие сбивают ход: все отвечают на один вопрос.
    if (session.status === "running" && session.mode === "sync") {
      throw new BadRequestException("Квиз уже идёт, подключиться нельзя");
    }
    if (players.length >= MAX_PLAYERS) {
      throw new BadRequestException(`В сессии уже ${MAX_PLAYERS} участников`);
    }

    const name = cleanPlayerName(rawName);
    if (!name) throw new BadRequestException("Введите имя");
    if (isNameTaken(name, players.map((p) => p.name))) {
      throw new BadRequestException("Такое имя уже занято, выберите другое");
    }

    const player: Player = {
      id: randomUUID(), name, score: 0, connected: true, joinedAt: Date.now(),
    };
    await this.savePlayer(session.code, player);
    return { session, player, restored: false };
  }

  /**
   * Проверить ключ ведущего. Сравнение постоянного времени: обычное
   * посимвольное выдаёт длину совпавшего начала и позволяет подобрать ключ.
   */
  async isHost(code: string, hostKey: string): Promise<boolean> {
    const stored = await this.redis.client.hget(this.key(normalizeSessionCode(code)), "hostKey");
    if (!stored || !hostKey) return false;
    const a = Buffer.from(stored);
    const b = Buffer.from(hostKey);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async players(code: string): Promise<Player[]> {
    const raw = await this.redis.client.hgetall(this.playersKey(code));
    return Object.values(raw ?? {})
      .map((v) => { try { return JSON.parse(v) as Player; } catch { return null; } })
      .filter((p): p is Player => !!p)
      .sort((a, b) => a.joinedAt - b.joinedAt);
  }

  async setConnected(code: string, playerId: string, connected: boolean): Promise<void> {
    const player = (await this.players(code)).find((p) => p.id === playerId);
    if (!player) return;
    player.connected = connected;
    await this.savePlayer(code, player);
  }

  async setStatus(code: string, status: SessionStatus, currentIndex?: number): Promise<void> {
    const patch: Record<string, string | number> = { status };
    if (currentIndex !== undefined) patch.currentIndex = currentIndex;
    await this.redis.client.hset(this.key(code), patch);
  }

  /** Закрыть сессию и стереть участников: временные имена не должны пережить урок. */
  async close(code: string): Promise<void> {
    await this.redis.client.del(this.key(code), this.playersKey(code));
    this.logger.log(`Сессия ${code} закрыта, данные участников удалены`);
  }

  private async savePlayer(code: string, player: Player): Promise<void> {
    await this.redis.client
      .multi()
      .hset(this.playersKey(code), player.id, JSON.stringify(player))
      .expire(this.playersKey(code), TTL_SECONDS)
      .exec();
  }

  private flatten(state: SessionState): Record<string, string | number> {
    return {
      code: state.code, quizId: state.quizId, teacherId: state.teacherId,
      mode: state.mode, status: state.status,
      currentIndex: state.currentIndex, createdAt: state.createdAt,
    };
  }
}

export { MAX_NAME_LENGTH };
