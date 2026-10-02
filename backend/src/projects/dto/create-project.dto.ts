import { IsDateString, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class CreateProjectDto {
	@IsString()
	@IsNotEmpty()
	@Matches(/\S/, { message: 'Project name cannot be blank' })
	@Length(1, 140)
	name!: string;

	@IsOptional()
	@IsString()
	@MaxLength(4000)
	description?: string | null;

	@IsOptional()
	@IsDateString()
	startDate?: string | null;

	@IsOptional()
	@IsDateString()
	targetDate?: string | null;
}
