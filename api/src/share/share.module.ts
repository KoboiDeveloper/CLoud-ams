import { Module } from '@nestjs/common';
import { ShareService } from './share.service';
import { ShareController } from './share.controller';
import { DriveModule } from '../drive/drive.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [DriveModule, StorageModule],
  controllers: [ShareController],
  providers: [ShareService],
})
export class ShareModule {}
