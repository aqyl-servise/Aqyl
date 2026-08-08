import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentRecord } from './entities/consent-record.entity';
import { ConsentService } from './consent.service';

/** Журнал согласий на обработку персональных данных. */
@Module({
  imports: [TypeOrmModule.forFeature([ConsentRecord])],
  providers: [ConsentService],
  exports: [ConsentService],
})
export class ConsentModule {}
