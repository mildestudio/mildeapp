import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TaskCommentDto {
	@IsOptional()
	@IsString()
	@MaxLength(2000)
	@ApiPropertyOptional({ maxLength: 2000 })
	comment?: string;
}
