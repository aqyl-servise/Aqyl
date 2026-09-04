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
 * Шлюз живого квиза (ТЗ 3.0, слой 1).
 *
 * Этот этап — комната и лобби: вход по коду, список участников, обрывы связи.
 * Ход игры (вопросы, ответы, лидерборд) добавляется следующим этапом.
 */
@WebSocketGateway({
  cors: { origin: [ORIGIN, "http://localhost:3000"], credentials: true },
  // Путь фиксируем: nginx проксирует именно /socket.io/ на этот процесс.
  path: "/socket.io/",
})
export class QuizGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(QuizGateway.name);

  @WebSocketServer()
  server!: Server;

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
