import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

const previousDatabaseUrl = process.env['DATABASE_URL'];

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    process.env['DATABASE_URL'] ??= 'postgresql://postgres:postgres@localhost:5432/test';
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterAll(() => {
    if (previousDatabaseUrl === undefined) delete process.env['DATABASE_URL'];
    else process.env['DATABASE_URL'] = previousDatabaseUrl;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
