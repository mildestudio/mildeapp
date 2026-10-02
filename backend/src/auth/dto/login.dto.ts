import{ IsNotEmpty, IsEmail, IsString} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @IsEmail()
    @ApiProperty({ example: 'owner@milde.test', format: 'email' })
    email: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ format: 'password', writeOnly: true, description: 'Account password. Use the configured development seed password for demo accounts.' })
    password: string;
}
