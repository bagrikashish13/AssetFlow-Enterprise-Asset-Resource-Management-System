import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetQueryDto } from './dto/asset-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = randomUUID() + extname(file.originalname);
          cb(null, uniqueSuffix);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
          return cb(
            new BadRequestException(
              'Only jpeg, png, and webp images are allowed',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  create(
    @Body() createAssetDto: CreateAssetDto,
    @CurrentUser('id') userId: string,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    if (photo) {
      createAssetDto.photoUrl = `/uploads/${photo.filename}`;
    }
    // If the DTO comes from form-data, boolean/json might need parsing
    if (typeof createAssetDto.isBookable === 'string') {
      createAssetDto.isBookable = createAssetDto.isBookable === 'true';
    }
    if (typeof createAssetDto.customFieldValues === 'string') {
      try {
        createAssetDto.customFieldValues = JSON.parse(
          createAssetDto.customFieldValues,
        ) as Record<string, string | number>;
      } catch {
        // Malformed JSON — leave as-is and let validation reject it.
      }
    }
    if (typeof createAssetDto.acquisitionCost === 'string') {
      createAssetDto.acquisitionCost = parseFloat(
        createAssetDto.acquisitionCost,
      );
    }

    return this.assetsService.create(createAssetDto, userId);
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.ASSET_MANAGER,
    UserRole.DEPT_HEAD,
    UserRole.EMPLOYEE,
  )
  findAll(@Query() query: AssetQueryDto) {
    return this.assetsService.findAll(query);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.ASSET_MANAGER,
    UserRole.DEPT_HEAD,
    UserRole.EMPLOYEE,
  )
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAssetDto: UpdateAssetDto,
  ) {
    return this.assetsService.update(id, updateAssetDto);
  }

  @Get(':id/history')
  @Roles(
    UserRole.ADMIN,
    UserRole.ASSET_MANAGER,
    UserRole.DEPT_HEAD,
    UserRole.EMPLOYEE,
  )
  getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.getHistory(id);
  }

  @Post(':id/retire')
  @Roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)
  retire(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.retire(id);
  }

  @Post(':id/dispose')
  @Roles(UserRole.ADMIN)
  dispose(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.dispose(id);
  }

  @Post(':id/mark-found')
  @Roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)
  markFound(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.markFound(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.assetsService.remove(id);
  }
}
