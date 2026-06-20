import { Global, Module } from "@nestjs/common";
import { StorageService } from "./storage.service";

// @Global — StorageService доступен во всех модулях без явного импорта.
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
