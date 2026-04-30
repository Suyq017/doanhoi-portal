import { Test } from '@nestjs/testing';
import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { UsersController } from '../../users/users.controller';
import { UsersService } from '../../users/users.service';
import { ImportService } from '../../users/services/import.service';
import { BatchImportService } from '../../users/services/batch-import.service';
import { RolesService } from '../../roles/roles.service';

describe('Users create -> list integration', () => {
  let app: INestApplication;

  const usersService = {
    create: jest.fn(),
    findAll: jest.fn(),
  };

  const importService = { generateTemplate: jest.fn() };
  const batchImportService = {} as any;
  const rolesService = { getAllRoles: jest.fn() };

  const makeAuthGuard = (): CanActivate => ({
    canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest();
      req.user = { id: 'user-1', email: 'test@example.com' };
      return true;
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: ImportService, useValue: importService },
        { provide: BatchImportService, useValue: batchImportService },
        { provide: RolesService, useValue: rolesService },
      ],
    })
      .overrideGuard(require('../../auth/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue(makeAuthGuard())
      .compile();

    app = moduleRef.createNestApplication();
    app.useLogger(false);
    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it('POST /users then GET /users returns created user in list', async () => {
    const created = { id: 'u-1', email: 'test@example.com' };
    usersService.create.mockResolvedValue(created);
    usersService.findAll.mockResolvedValue({ users: [created], total: 1 });

    await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'test@example.com', fullName: 'Test' })
      .expect(201)
      .expect(created);

    const listResp = await request(app.getHttpServer())
      .get('/users')
      .expect(200);

    expect(listResp.body).toEqual({ users: [created], total: 1 });
    expect(usersService.create).toHaveBeenCalled();
    expect(usersService.findAll).toHaveBeenCalled();
  });
});
