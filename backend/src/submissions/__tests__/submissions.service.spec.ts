import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SubmissionsService } from "../submissions.service";
import { SubmissionStatus } from "../../entities/template-submission.entity";

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(),
}));

describe("SubmissionsService", () => {
  const createSubmissionRepositoryMock = () => ({
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    findOne: jest.fn(),
    remove: jest.fn(),
  });

  const createTemplateRepositoryMock = () => ({
    findOne: jest.fn(),
  });

  const createAwsConfigServiceMock = () => ({
    getActiveConfig: jest.fn(),
  });

  let submissionRepository: ReturnType<typeof createSubmissionRepositoryMock>;
  let templateRepository: ReturnType<typeof createTemplateRepositoryMock>;
  let awsConfigService: ReturnType<typeof createAwsConfigServiceMock>;

  beforeEach(() => {
    jest.spyOn(SubmissionsService.prototype as any, "initializeS3Client").mockResolvedValue(undefined);
    submissionRepository = createSubmissionRepositoryMock();
    templateRepository = createTemplateRepositoryMock();
    awsConfigService = createAwsConfigServiceMock();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createService = () => {
    const service = new SubmissionsService(
      submissionRepository as never,
      templateRepository as never,
      awsConfigService as never,
    );

    (service as any).s3Config = {
      s3Bucket: "bucket",
      s3Endpoint: "http://localhost:9000",
    };
    (service as any).s3Client = { send: jest.fn().mockResolvedValue({}) };

    return service;
  };

  it("should create a draft submission", async () => {
    const service = createService();
    templateRepository.findOne.mockResolvedValue({ id: "template-1", fields: [] });
    submissionRepository.save.mockImplementation(async (value) => ({ ...value, id: "sub-1" }));

    const result = await service.create(
      { templateId: "template-1", formData: { name: "A" } } as never,
      "user-1",
    );

    expect(result.id).toBe("sub-1");
    expect(result.status).toBe(SubmissionStatus.DRAFT);
  });

  it("should submit and trigger document generation", async () => {
    const service = createService();
    submissionRepository.findOne.mockResolvedValue({
      id: "sub-1",
      userId: "user-1",
      status: SubmissionStatus.DRAFT,
      template: { fields: [] },
    });
    const generateSpy = jest.spyOn(service, "generateDocument").mockResolvedValue(undefined);

    const result = await service.submit("sub-1", "user-1");

    expect(result.status).toBe(SubmissionStatus.SUBMITTED);
    expect(generateSpy).toHaveBeenCalledWith("sub-1");
  });

  it("should return cached presigned URL on repeated calls", async () => {
    const service = createService();
    (getSignedUrl as jest.Mock).mockResolvedValueOnce("http://signed-url");
    submissionRepository.findOne.mockResolvedValue({
      id: "sub-1",
      userId: "user-1",
      status: SubmissionStatus.COMPLETED,
      outputFileUrl: "http://localhost:9000/bucket/files/output.docx",
      outputFileName: "output.docx",
    });

    const first = await service.getPublicUrl("sub-1", "user-1");
    const second = await service.getPublicUrl("sub-1", "user-1");

    expect(first.url).toBe("http://signed-url");
    expect(second.url).toBe("http://signed-url");
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
  });
});