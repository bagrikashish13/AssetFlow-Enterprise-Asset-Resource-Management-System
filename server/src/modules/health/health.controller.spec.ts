import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  const prismaMock = { $queryRaw: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prismaMock }],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('reports ok with database up when the probe query succeeds', async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(new Date(result.timestamp).getTime()).not.toBeNaN();
  });

  it('reports database down when the probe query fails', async () => {
    prismaMock.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('down');
  });
});
