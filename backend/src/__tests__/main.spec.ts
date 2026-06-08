import { describe, expect, it, jest, beforeEach, afterEach } from "@jest/globals";

const originalEnv = process.env;

const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve));

const createNestMocks = (appMock: any) => {
  jest.doMock("../app.module", () => ({
    AppModule: class AppModule {},
  }));

  jest.doMock("@nestjs/core", () => ({
    NestFactory: {
      create: (jest.fn() as any).mockResolvedValue(appMock),
    },
  }));

  jest.doMock("@nestjs/swagger", () => ({
    SwaggerModule: {
      createDocument: jest.fn().mockReturnValue({}),
      setup: jest.fn(),
    },
    DocumentBuilder: jest.fn().mockImplementation(() => ({
      setTitle() {
        return this;
      },
      setDescription() {
        return this;
      },
      setVersion() {
        return this;
      },
      addBearerAuth() {
        return this;
      },
      build() {
        return { title: "test" };
      },
    })),
  }));

  jest.doMock("express", () => {
    const expressMock = Object.assign(jest.fn(), {
      json: jest.fn(() => "json-middleware"),
      urlencoded: jest.fn(() => "urlencoded-middleware"),
    });
    return Object.assign(expressMock, {
      __esModule: true,
      default: expressMock,
    });
  });
};

describe("bootstrap", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it("should bootstrap in development with local origins", async () => {
    process.env.NODE_ENV = "development";
    process.env.PORT = "9300";

    const appMock = {
      use: jest.fn(),
      enableCors: jest.fn(),
      get: jest.fn().mockReturnValue({}),
      useGlobalInterceptors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: (jest.fn() as any).mockResolvedValue(undefined),
    } as any;

    jest.isolateModules(() => {
      createNestMocks(appMock);
      require("../main");
    });
    await flushPromises();

    expect(appMock.use).toHaveBeenCalledWith("json-middleware");
    expect(appMock.use).toHaveBeenCalledWith("urlencoded-middleware");
    expect(appMock.enableCors).toHaveBeenCalledWith({
      origin: ["http://localhost:9100", "http://localhost:3000"],
      credentials: true,
    });
    expect(appMock.get).toHaveBeenCalledTimes(1);
    expect(appMock.useGlobalInterceptors).toHaveBeenCalledWith(
      expect.objectContaining({ metricsService: {} }),
    );
    expect(appMock.useGlobalPipes).toHaveBeenCalled();
    expect(appMock.listen).toHaveBeenCalledWith("9300");
  });

  it("should bootstrap in production with deployed origins", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.PORT;
    process.env.FRONTEND_URL = "https://portal.example.com";

    const appMock = {
      use: jest.fn(),
      enableCors: jest.fn(),
      get: jest.fn().mockReturnValue({}),
      useGlobalInterceptors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: (jest.fn() as any).mockResolvedValue(undefined),
    } as any;

    jest.isolateModules(() => {
      createNestMocks(appMock);
      require("../main");
    });
    await flushPromises();

    expect(appMock.enableCors).toHaveBeenCalledWith({
      origin: [
        "https://portal.example.com",
        "https://portal.tuoitrebachkhoa.com/grafana",
        "https://portal.tuoitrebachkhoa.com/prometheus",
      ],
      credentials: true,
    });
    expect(appMock.listen).toHaveBeenCalledWith(9200);
  });
});
