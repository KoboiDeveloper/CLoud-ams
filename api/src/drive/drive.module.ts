import { Module } from '@nestjs/common';
import { DriveService } from './drive.service';
import { DriveController } from './drive.controller';
import { StorageModule } from '../storage/storage.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [StorageModule, UserModule],
  controllers: [DriveController],
  providers: [DriveService],
  exports: [DriveService],
})
export class DriveModule {}
