import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AssetStateMachine } from './asset-state.machine';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [AssetsController],
  providers: [AssetsService, AssetStateMachine],
  exports: [AssetsService, AssetStateMachine],
})
export class AssetsModule {}
