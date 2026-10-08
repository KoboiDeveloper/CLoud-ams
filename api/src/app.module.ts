import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { DriveModule } from './drive/drive.module';
import { ShareModule } from './share/share.module';
import { AdminModule } from './admin/admin.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    StorageModule,
    AuthModule,
    UserModule,
    RoleModule,
    DriveModule,
    ShareModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
