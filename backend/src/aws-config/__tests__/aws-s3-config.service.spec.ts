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

  it("should return all configs ordered by createdAt", async () => {
    repository.find.mockResolvedValue([{ id: "cfg-2" }, { id: "cfg-1" }]);

    await expect(service.getAllConfigs()).resolves.toEqual([{ id: "cfg-2" }, { id: "cfg-1" }]);
    expect(repository.find).toHaveBeenCalledWith({ order: { createdAt: "DESC" } });
  });

  it("should update config with and without reactivation", async () => {
    repository.findOne.mockResolvedValueOnce({ id: "cfg-1", isActive: false }).mockResolvedValueOnce({ id: "cfg-2", isActive: false });
    repository.save.mockImplementation(async (value) => value);

    const updated = await service.updateConfig("cfg-1", { region: "ap-southeast-1" });
    expect(updated.region).toBe("ap-southeast-1");
    expect(repository.update).not.toHaveBeenCalled();

    const activated = await service.updateConfig("cfg-2", { isActive: true });
    expect(activated.isActive).toBe(true);
    expect(repository.update).toHaveBeenCalledWith({ id: expect.anything(), isActive: true }, { isActive: false });
  });

  it("should throw when updating or deleting missing config", async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.updateConfig("missing", {})).rejects.toThrow("AWS S3 configuration not found");
    await expect(service.deleteConfig("missing")).rejects.toThrow("AWS S3 configuration not found");
  });

  it("should delete existing config and test config successfully", async () => {
    repository.findOne.mockResolvedValueOnce({ id: "cfg-1" }).mockResolvedValueOnce({ id: "cfg-2" });

    await expect(service.deleteConfig("cfg-1")).resolves.toBeUndefined();
    expect(repository.remove).toHaveBeenCalledWith({ id: "cfg-1" });

    await expect(service.testConfig("cfg-2")).resolves.toBe(true);
  });

  it("should throw when test config is missing", async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.testConfig("missing")).rejects.toThrow("AWS S3 configuration not found");
  });
});