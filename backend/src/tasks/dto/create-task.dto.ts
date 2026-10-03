import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class CreateTaskDto {
	@IsString()
	@Matches(/\S/, { message: 'Task title cannot be blank' })
	@Length(1, 160)
	@ApiProperty({ example: 'Create Kitchen 3D Design', maxLength: 160 })
	title!: string;

	@IsOptional()
	@IsString()
	@MaxLength(4000)
	@ApiPropertyOptional({ example: 'Prepare the first 3D visualization.' })
	description?: string | null;

	@IsString()
	@IsNotEmpty()
	@ApiProperty({ description: 'ProjectMember ID for an EMPLOYEE assigned to the project.' })
	assigneeId!: string;

	@IsOptional()
	@IsEnum(TaskPriority)
	@ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
	priority?: TaskPriority;

	@IsOptional()
	@IsDateString()
	@ApiPropertyOptional({ example: '2026-10-07', format: 'date' })
	dueDate?: string | null;
}
