import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class UpdateTaskDto {
	@IsOptional()
	@IsString()
	@Matches(/\S/, { message: 'Task title cannot be blank' })
	@Length(1, 160)
	@ApiPropertyOptional({ maxLength: 160 })
	title?: string;

	@IsOptional()
	@IsString()
	@MaxLength(4000)
	@ApiPropertyOptional({ nullable: true, maxLength: 4000 })
	description?: string | null;

	@IsOptional()
	@IsEnum(TaskPriority)
	@ApiPropertyOptional({ enum: TaskPriority })
	priority?: TaskPriority;

	@IsOptional()
	@IsDateString()
	@ApiPropertyOptional({ format: 'date', nullable: true })
	dueDate?: string | null;

	@IsOptional()
	@IsString()
	@Length(1, 160)
	@ApiPropertyOptional({ description: 'ProjectMember ID for an EMPLOYEE assigned to the project.' })
	assigneeId?: string;
}
