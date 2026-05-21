import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KmzhGenerationSession } from './entities/kmzh-generation-session.entity';

const MAX_REGENERATIONS = 3;

@Injectable()
export class KmzhSessionService {
  constructor(
    @InjectRepository(KmzhGenerationSession)
    private readonly sessionRepo: Repository<KmzhGenerationSession>,
  ) {}

  async createSession(userId: string, schoolId: string): Promise<string> {
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const session = await this.sessionRepo.save({
      userId,
      schoolId,
      regenCount: 0,
      expiresAt,
    });
    return session.id;
  }

  async getRegenCount(sessionId: string): Promise<number> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session || new Date() > session.expiresAt) return 0;
    return session.regenCount;
  }

  async incrementRegen(sessionId: string): Promise<number> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new Error('Session not found');
    if (session.regenCount >= MAX_REGENERATIONS) {
      throw new HttpException(
        'Максимальное количество перегенераций исчерпано (3/3)',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.sessionRepo.update(session.id, {
      regenCount: session.regenCount + 1,
    });
    return session.regenCount + 1;
  }
}
