import { Module } from '@nestjs/common';
import { MlClientService } from './ml-client.service';
import { VectorSyncService } from './vector-sync.service';

@Module({
  providers: [MlClientService, VectorSyncService],
  exports: [MlClientService, VectorSyncService],
})
export class MlClientModule {}
