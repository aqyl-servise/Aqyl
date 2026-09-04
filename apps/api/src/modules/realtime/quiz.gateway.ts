import { Logger } from "@nestjs/common";
import {
  ConnectedSocket, MessageBody, OnGatewayDisconnect,
  SubscribeMessage, WebSocketGateway, WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { SessionService, type Player } from "./session.service";

/** Что сокет знает о себе: подставляется при входе и читается при обрыве. */
interface SocketState { code?: string; playerId?: string; isHost?: boolean }

const ORIGIN = process.env.PLAY_ORIGIN ?? "https://play.aqyl-service.kz";

/**
 * Кто вправе открыть соединение. Учеников пускаем с поддомена, а экран
 * ведущего живёт в кабинете на основном домене — без него учитель не смог бы
 * подключиться к собственной сессии.
 */
const ALLOWED_ORIGINS = [
  ORIGIN,
  process.env.APP_ORIGIN ?? "https://aqyl-service.kz",
  "http://localhost:3000",
];

/** Сколько секунд на вопрос по умолчанию. */
const DEFAULT_LIMIT_MS = 20000;

/**
 * Шлюз живого квиза (ТЗ 3.0, слои 1-2).
 *
 * Комната и лобби, показ вопросов, приём ответов, лидерборд. Правильный ответ
 * наружу не уходит до закрытия вопроса, а время ответа считается по часам
 * сервера: и то и другое иначе позволяет набрать полный балл не думая.
 */
@WebSocketGateway({
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
  // Путь фиксируем: nginx проксирует именно /socket.io/ на этот процесс.
  path: "/socket.io/",
})
export class QuizGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(QuizGateway.name);

  @WebSocketServer()
  server!: Server;

  /**
   * Таймеры открытых вопросов. Живут в памяти процесса: при перезапуске
   * автозакрытие теряется, но срок вопроса записан в Redis, а ведущий может
   * переключить вопрос рукой — урок из-за этого не встанет.
   */
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly sessions: SessionService) {}

  /**
   * Вход ученика. playerId клиент хранит у себя и присылает при
   * переподключении — так место и счёт переживают обрыв связи (ТЗ 3.0, п. 2.4).
   */
  @SubscribeMessage("join")
  async onJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { code?: string; name?: string; playerId?: string },
  ) {
    try {
      const { session, player, restored } = await this.sessions.join(
        body?.code ?? "", body?.name ?? "", body?.playerId,
      );

      const state = socket.data as SocketState;
      state.code = session.code;
      state.playerId = player.id;
      await socket.join(session.code);

      await this.broadcastLobby(session.code);
      this.logger.log(
        `${restored ? "Вернулся" : "Вошёл"} ${player.name} в сессию ${session.code}`,
      );

      return {
        ok: true,
        playerId: player.id,
        name: player.name,
        restored,
        session: { code: session.code, mode: session.mode, status: session.status },
      };
    } catch (err) {
      // Ошибку отдаём ответом, а не исключением: у ученика на экране должен
      // появиться понятный текст, а не молчащая форма.
      return { ok: false, error: (err as Error).message };
    }
  }

  /** Экран ведущего. Ключ выдан учителю при создании сессии. */
  @SubscribeMessage("host-join")
  async onHostJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { code?: string; hostKey?: string },
  ) {
    const code = body?.code ?? "";
    if (!(await this.sessions.isHost(code, body?.hostKey ?? ""))) {
      return { ok: false, error: "Нет доступа к управлению сессией" };
    }
    const session = await this.sessions.get(code);
    if (!session) return { ok: false, error: "Сессия не найдена" };

    const state = socket.data as SocketState;
    state.code = session.code;
    state.isHost = true;
    await socket.join(this.hostRoom(session.code));

    return {
      ok: true,
      session: { code: session.code, mode: session.mode, status: session.status },
      players: this.publicPlayers(await this.sessions.players(session.code)),
    };
  }

  /** Запуск игры ведущим. */
  @SubscribeMessage("start-quiz")
  async onStart(@ConnectedSocket() socket: Socket, @MessageBody() body: { code?: string; hostKey?: string; limitMs?: number }) {
    if (!(await this.sessions.isHost(body?.code ?? "", body?.hostKey ?? ""))) {
      return { ok: false, error: "Нет доступа к управлению сессией" };
    }
    return this.openQuestion(body!.code!, 0, body?.limitMs);
  }

  /** Следующий вопрос или финал, если вопросы кончились. */
  @SubscribeMessage("next-question")
  async onNext(@ConnectedSocket() socket: Socket, @MessageBody() body: { code?: string; hostKey?: string; limitMs?: number }) {
    const code = body?.code ?? "";
    if (!(await this.sessions.isHost(code, body?.hostKey ?? ""))) {
      return { ok: false, error: "Нет доступа к управлению сессией" };
    }
    const session = await this.sessions.get(code);
    if (!session) return { ok: false, error: "Сессия не найдена" };

    const next = session.currentIndex + 1;
    const questions = await this.sessions.questions(code);
    if (next >= questions.length) return this.finish(code);
    return this.openQuestion(code, next, body?.limitMs);
  }

  /** Ответ ученика. Балл считает сервер по своему времени. */
  @SubscribeMessage("answer")
  async onAnswer(@ConnectedSocket() socket: Socket, @MessageBody() body: { optionIndex?: number }) {
    const { code, playerId } = (socket.data ?? {}) as SocketState;
    if (!code || !playerId) return { ok: false, error: "Вы не в сессии" };

    const session = await this.sessions.get(code);
    if (!session || session.status !== "running") return { ok: false, error: "Вопрос закрыт" };

    const result = await this.sessions.submitAnswer(
      code, playerId, session.currentIndex, Number(body?.optionIndex),
      session.mode === "sync",
    );
    // null — уже отвечал или опоздал. Второй ответ не принимаем: иначе можно
    // перебрать варианты и всегда попасть.
    if (!result) return { ok: false, error: "Ответ не принят" };

    const answered = Object.keys(await this.sessions.answers(code, session.currentIndex)).length;
    const total = (await this.sessions.players(code)).filter((p) => p.connected).length;
    this.server.to(this.hostRoom(code)).emit("answers-progress", { answered, total });

    // Все ответили — не держим класс до конца таймера.
    if (answered >= total) await this.closeQuestion(code, session.currentIndex);

    return { ok: true, correct: result.correct, gained: result.gained, total: result.total };
  }

  /** Завершить квиз досрочно. */
  @SubscribeMessage("end-quiz")
  async onEnd(@ConnectedSocket() socket: Socket, @MessageBody() body: { code?: string; hostKey?: string }) {
    if (!(await this.sessions.isHost(body?.code ?? "", body?.hostKey ?? ""))) {
      return { ok: false, error: "Нет доступа к управлению сессией" };
    }
    return this.finish(body!.code!);
  }

  /** Открыть вопрос всем и завести серверный таймер. */
  private async openQuestion(code: string, index: number, limitMs?: number) {
    const questions = await this.sessions.questions(code);
    const question = questions[index];
    if (!question) return { ok: false, error: "Вопрос не найден" };

    const limit = Math.min(Math.max(Number(limitMs) || DEFAULT_LIMIT_MS, 5000), 120000);
    const { endsAt } = await this.sessions.startQuestion(code, index, limit);

    // Ученику уходит только текст и варианты: правильный ответ остаётся на
    // сервере, иначе его видно в консоли браузера.
    this.server.to(code).to(this.hostRoom(code)).emit("question-start", {
      index, total: questions.length,
      text: question.text, options: question.options,
      endsAt, limitMs: limit,
    });

    this.clearTimer(code);
    this.timers.set(code, setTimeout(() => {
      void this.closeQuestion(code, index);
    }, limit + 500));

    return { ok: true, index, endsAt };
  }

  /** Закрыть вопрос: показать правильный ответ и обновлённый лидерборд. */
  private async closeQuestion(code: string, index: number): Promise<void> {
    this.clearTimer(code);
    const questions = await this.sessions.questions(code);
    const question = questions[index];
    if (!question) return;

    const standings = await this.sessions.standings(code);
    this.server.to(code).to(this.hostRoom(code)).emit("question-end", {
      index, correctIndex: question.correctIndex, standings,
    });
  }

  private async finish(code: string) {
    this.clearTimer(code);
    await this.sessions.setStatus(code, "finished");
    const standings = await this.sessions.standings(code);
    this.server.to(code).to(this.hostRoom(code)).emit("quiz-end", { standings });
    return { ok: true, standings };
  }

  private clearTimer(code: string): void {
    const t = this.timers.get(code);
    if (t) { clearTimeout(t); this.timers.delete(code); }
  }

  /**
   * Обрыв связи. Участника не удаляем: он вернётся по тому же playerId, а имя
   * в списке должно остаться, иначе учитель решит, что ученик ушёл совсем.
   */
  async handleDisconnect(socket: Socket): Promise<void> {
    const { code, playerId } = (socket.data ?? {}) as SocketState;
    if (!code || !playerId) return;
    await this.sessions.setConnected(code, playerId, false);
    await this.broadcastLobby(code);
  }

  private hostRoom(code: string) { return `${code}:host`; }

  /** Список участников уходит и ученикам, и на проектор. */
  private async broadcastLobby(code: string): Promise<void> {
    const players = this.publicPlayers(await this.sessions.players(code));
    this.server.to(code).to(this.hostRoom(code)).emit("lobby-update", { players });
  }

  /** Наружу отдаём только то, что видно на экране: без времени входа. */
  private publicPlayers(players: Player[]) {
    return players.map((p) => ({
      id: p.id, name: p.name, score: p.score, connected: p.connected,
    }));
  }
}
