import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { HotspotType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @ApiPropertyOptional({ nullable: true, example: 'https://images.example.test/living-room-360.jpg', description: 'HTTP(S) URL for an equirectangular panorama (normally 2:1). The image server must allow cross-origin loading. No uploads are provided by this API.' })
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
  @ApiPropertyOptional({ nullable: true, example: 30, default: 0, description: 'Starting yaw in degrees. Null uses the default of 0. Saved by OWNER via PATCH /scenes/:sceneId.' })
  initialYaw?: number | null;
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  @ApiPropertyOptional({ nullable: true, example: -5, default: 0, description: 'Starting pitch in degrees; positive looks up, negative looks down. Null uses 0.' })
  initialPitch?: number | null;
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  @Max(179)
  @ApiPropertyOptional({ nullable: true, example: 90, default: 90, description: 'Starting horizontal field of view in degrees (1..179). Null uses 90. These are scene camera values, not viewer-library configuration objects.' })
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
  @ApiProperty({ enum: HotspotType, example: 'INFO', description: 'NAVIGATION opens a scene in the same project; INFO displays the title and description. No other hotspot types are supported.' })
  type!: HotspotType;
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-360)
  @Max(360)
  @ApiProperty({ example: 42.5, description: 'Horizontal angular position in degrees. Visual placement in the viewer sends this value; no pixel coordinates are stored.' })
  yaw!: number;
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  @ApiProperty({ example: -4.2, description: 'Vertical angular position in degrees (-90..90); positive points up, negative points down.' })
  pitch!: number;
}
export class UpdateHotspotDto extends HotspotFieldsDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(HotspotType)
  @ApiPropertyOptional({ enum: HotspotType, description: 'Switching to NAVIGATION requires a valid same-project target.' })
  type?: HotspotType;
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-360)
  @Max(360)
  @ApiPropertyOptional({ example: 20, description: 'New yaw in degrees. Send yaw and pitch to move a hotspot; omitted fields retain their current values.' })
  yaw?: number;
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  @ApiPropertyOptional({ example: 5, description: 'New pitch in degrees. Positive points up, negative points down.' })
  pitch?: number;
}
