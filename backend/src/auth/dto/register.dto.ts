import{ IsNotEmpty, IsEmail, IsString, MinLength} from 'class-validator';
export class RegisterDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    email: string;

    @MinLength(8)
    @IsString()
    password: string;

}