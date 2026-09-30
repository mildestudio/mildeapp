import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { register: jest.fn(), login: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns the authenticated user on the current-user route', () => {
    const user = {
      id: 'user-1',
      name: 'Test Client',
      email: 'client@milde.test',
      role: 'CLIENT' as const,
    };

    expect(controller.me(user)).toEqual(user);
  });
});
