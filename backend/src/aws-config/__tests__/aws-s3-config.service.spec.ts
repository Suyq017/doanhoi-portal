import { AwsS3ConfigService } from "../aws-s3-config.service";

describe("AwsS3ConfigService", () => {
  const createRepositoryMock = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    remove: jest.fn(),
  });

  let repository: ReturnType<typeof createRepositoryMock>;
  let service: AwsS3ConfigService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new AwsS3ConfigService(repository as never);
  });

  it("should return the active config", async () => {
    repository.findOne.mockResolvedValue({ id: "cfg-1", isActive: true });

    await expect(service.getActiveConfig()).resolves.toEqual({ id: "cfg-1", isActive: true });
  });

  it("should create a config and deactivate old ones", async () => {
    repository.save.mockImplementation(async (value) => ({ ...value, id: "cfg-2" }));

    const result = await service.createConfig({
      accessKeyId: "ak",
      secretAccessKey: "sk",
      region: "ap-southeast-1",
      s3Bucket: "bucket",
      s3Endpoint: "http://localhost:9000",
    });

    expect(repository.update).toHaveBeenCalledWith({ isActive: true }, { isActive: false });
    expect(result.isActive).toBe(true);
    expect(result.id).toBe("cfg-2");
  });
});