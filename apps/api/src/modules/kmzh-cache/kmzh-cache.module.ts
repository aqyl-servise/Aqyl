import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KmzhCache } from "./entities/kmzh-cache.entity";
import { KmzhCacheHit } from "./entities/kmzh-cache-hit.entity";
import { KmzhCacheService } from "./kmzh-cache.service";
import { KmzhCacheController } from "./kmzh-cache.controller";

@Module({
  imports: [TypeOrmModule.forFeature([KmzhCache, KmzhCacheHit])],
  controllers: [KmzhCacheController],
  providers: [KmzhCacheService],
  exports: [KmzhCacheService],
})
export class KmzhCacheModule {}
