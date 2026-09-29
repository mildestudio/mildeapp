import { IsNotEmpty, IsEmail, IsString, Matches, MinLength } from 'class-validator';
export class RegisterDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    email: string;

    @MinLength(8)
    @Matches(/[A-Z]/, { message: 'Password must include at least one uppercase letter' })
    @Matches(/[0-9]/, { message: 'Password must include at least one number' })
    @Matches(/[^A-Za-z0-9]/, { message: 'Password must include at least one symbol' })
    @IsString()
    password: string;

}
