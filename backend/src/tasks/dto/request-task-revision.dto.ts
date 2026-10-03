import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class RequestTaskRevisionDto {
	@IsString()
	@Matches(/\S/, { message: 'Revision reason cannot be blank' })
	@Length(1, 2000)
	@ApiProperty({ example: 'Kitchen island dimensions do not match the approved layout.' })
	reason!: string;
}
