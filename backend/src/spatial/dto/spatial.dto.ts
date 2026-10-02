import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { HotspotType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSpaceDto {
  @IsString()
  @Matches(/\S/, { message: 'Name cannot be blank' })
  @MaxLength(140)
  name!: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  sortOrder?: number;
}
export class UpdateSpaceDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Matches(/\S/, { message: 'Name cannot be blank' })
  @MaxLength(140)
  name?: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  sortOrder?: number;
}
class SceneFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  @MaxLength(2048)
  panoramaUrl?: string | null;
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  @MaxLength(2048)
  thumbnailUrl?: string | null;
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  sortOrder?: number;
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-360)
  @Max(360)
  initialYaw?: number | null;
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  initialPitch?: number | null;
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  @Max(179)
  initialFov?: number | null;
}
export class CreateSceneDto extends SceneFieldsDto {
  @IsString()
  @Matches(/\S/, { message: 'Name cannot be blank' })
  @MaxLength(140)
  name!: string;
}
export class UpdateSceneDto extends SceneFieldsDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Matches(/\S/, { message: 'Name cannot be blank' })
  @MaxLength(140)
  name?: string;
}
class HotspotFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  title?: string | null;
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;
  @IsOptional()
  @IsString()
  @Matches(/\S/)
  @MaxLength(100)
  @ApiPropertyOptional({ nullable: true, description: 'Required for NAVIGATION. Target scene must exist in the same project as the source, including when changing an existing hotspot.' })
  targetSceneId?: string | null;
}
export class CreateHotspotDto extends HotspotFieldsDto {
  @IsEnum(HotspotType)
  type!: HotspotType;
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-360)
  @Max(360)
  yaw!: number;
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  pitch!: number;
}
export class UpdateHotspotDto extends HotspotFieldsDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(HotspotType)
  type?: HotspotType;
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-360)
  @Max(360)
  yaw?: number;
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  pitch?: number;
}
