import { ConflictException, UnauthorizedException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ){}
    async register(dto: RegisterDto){
        const existingUser = await this.prisma.user.findUnique({
            where:{
                email: dto.email,
            },
        });
        if(existingUser){
            throw new ConflictException(
                'email already registered',
            );
        }
        const passwordHash = await bcrypt.hash(dto.password, 12,);
        const user = await this.prisma.user.create({
            data:{
                name: dto.name,
                email: dto.email,
                passwordHash,
                role: 'CLIENT',
            },
        });
        return{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        };

    }

    async login(dto: LoginDto){
        const user = await this.prisma.user.findUnique({
            where:{
                email: dto.email,
            },
        });
        if(!user){
            throw new UnauthorizedException(
                'Invalid credentials',
            );
        }
        const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
        if(!passwordMatch){
            throw new UnauthorizedException('Invalid credentials',);
        }
        const payload = {
            sub: user.id,
            role: user.role,
        }
        const accessToken=await this.jwtService.signAsync(payload);
        return{accessToken,
            user:{
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            }
        }
    }
}
