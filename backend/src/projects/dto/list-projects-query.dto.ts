import { IsEnum, IsOptional } from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class ListProjectsQueryDto {
	@IsOptional()
	@IsEnum(ProjectStatus)
	status?: ProjectStatus;
}
