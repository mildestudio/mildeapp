import { IsDateString, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
	@IsString()
	@IsNotEmpty()
	@Matches(/\S/, { message: 'Project name cannot be blank' })
	@Length(1, 140)
	@ApiProperty({ example: 'Smith Residence' })
	name!: string;

	@IsOptional()
	@IsString()
	@MaxLength(4000)
	@ApiPropertyOptional({ example: 'Interior renovation', nullable: true })
	description?: string | null;

	@IsOptional()
	@IsDateString()
	@ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z', format: 'date-time', nullable: true })
	startDate?: string | null;

	@IsOptional()
	@IsDateString()
	@ApiPropertyOptional({ example: '2027-02-01T00:00:00.000Z', format: 'date-time', nullable: true, description: 'Must be on or after startDate.' })
	targetDate?: string | null;
}
