import { Global, Module } from '@nestjs/common';
import { DropboxStorageService } from './dropbox.storage.service';

@Global()
@Module({
  providers: [DropboxStorageService],
  exports: [DropboxStorageService],
})
export class StorageModule {}
