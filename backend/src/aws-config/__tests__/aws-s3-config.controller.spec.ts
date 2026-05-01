import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { AwsS3ConfigController } from "../aws-s3-config.controller";

describe("AwsS3ConfigController", () => {
  const awsS3ConfigService = {
    getActiveConfig: jest.fn(),
    getAllConfigs: jest.fn(),
    createConfig: jest.fn(),
    updateConfig: jest.fn(),
    deleteConfig: jest.fn(),
    testConfig: jest.fn(),
  } as any;

  let controller: AwsS3ConfigController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AwsS3ConfigController(awsS3ConfigService);
  });

  it("should return the active config", async () => {
    awsS3ConfigService.getActiveConfig.mockResolvedValueOnce({ id: "active" });

    await expect(controller.getActiveConfig()).resolves.toEqual({ id: "active" });
  });

  it("should return all configs", async () => {
    awsS3ConfigService.getAllConfigs.mockResolvedValueOnce([{ id: "cfg-1" }]);

    await expect(controller.getAllConfigs()).resolves.toEqual([{ id: "cfg-1" }]);
  });

  it("should create, update, delete, and test configs through the service", async () => {
    awsS3ConfigService.createConfig.mockResolvedValueOnce({ id: "created" });
    awsS3ConfigService.updateConfig.mockResolvedValueOnce({ id: "updated" });
    awsS3ConfigService.deleteConfig.mockResolvedValueOnce(undefined);
    awsS3ConfigService.testConfig.mockResolvedValueOnce(true);

    await expect(
      controller.createConfig({ accessKeyId: "a", secretAccessKey: "s", region: "ap-southeast-1", s3Bucket: "bucket", s3Endpoint: "https://s3.example.com" } as any),
    ).resolves.toEqual({ id: "created" });
    await expect(
      controller.updateConfig("cfg-1", { isActive: true } as any),
    ).resolves.toEqual({ id: "updated" });
    await expect(controller.deleteConfig("cfg-1")).resolves.toEqual({ message: "Configuration deleted successfully" });
    await expect(controller.testConfig("cfg-1")).resolves.toEqual({ success: true });

    expect(awsS3ConfigService.createConfig).toHaveBeenCalled();
    expect(awsS3ConfigService.updateConfig).toHaveBeenCalledWith("cfg-1", { isActive: true });
    expect(awsS3ConfigService.deleteConfig).toHaveBeenCalledWith("cfg-1");
    expect(awsS3ConfigService.testConfig).toHaveBeenCalledWith("cfg-1");
  });
});
