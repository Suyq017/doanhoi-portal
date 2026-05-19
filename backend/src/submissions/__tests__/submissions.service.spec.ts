import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SubmissionsService } from "../submissions.service";
import { SubmissionStatus } from "../../entities/template-submission.entity";
import { BadRequestException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import PizZip from "pizzip";

jest.mock("docxtemplater", () => {
  return jest.fn().mockImplementation(() => ({
    render: jest.fn(),
    getZip: () => ({
      generate: jest.fn(() => Buffer.from("generated-doc")),
    }),
  }));
});

jest.mock("pizzip", () => {
  return jest.fn().mockImplementation(() => ({
    file: jest.fn(),
  }));
});

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

  it("should reject create when template is missing", async () => {
    const service = createService();
    templateRepository.findOne.mockResolvedValue(null);

    await expect(service.create({ templateId: "missing", formData: {} } as never, "user-1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("should update only draft submissions", async () => {
    const service = createService();
    submissionRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "sub-1",
      userId: "user-1",
      status: SubmissionStatus.SUBMITTED,
      formData: {},
    }).mockResolvedValueOnce({
      id: "sub-1",
      userId: "user-1",
      status: SubmissionStatus.DRAFT,
      formData: { a: 1 },
    });

    await expect(service.update("missing", { formData: { a: 1 } } as never, "user-1")).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update("sub-1", { formData: { a: 2 } } as never, "user-1")).rejects.toBeInstanceOf(BadRequestException);

    const updated = await service.update("sub-1", { formData: { a: 3 } } as never, "user-1");
    expect(updated.formData).toEqual({ a: 3 });
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

  it("should reject submit for completed submission and propagate async generation errors", async () => {
    const service = createService();
    submissionRepository.findOne.mockResolvedValueOnce({
      id: "sub-1",
      userId: "user-1",
      status: SubmissionStatus.COMPLETED,
      template: { fields: [] },
    }).mockResolvedValueOnce({
      id: "sub-2",
      userId: "user-1",
      status: SubmissionStatus.DRAFT,
      template: { fields: [], originalFileUrl: "http://localhost:9000/bucket/template.docx", originalFileName: "template.docx" },
      formData: {},
    });
    jest.spyOn(service as any, "generateDocument").mockRejectedValue(new Error("gen failed"));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(service.submit("sub-1", "user-1")).rejects.toBeInstanceOf(BadRequestException);
    await service.submit("sub-2", "user-1");
    await Promise.resolve();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("should generate, download, and fail document generation branches", async () => {
    const service = createService();
    const saveSpy = jest.spyOn(submissionRepository, "save");
    submissionRepository.findOne.mockResolvedValueOnce({
      id: "sub-1",
      userId: "user-1",
      status: SubmissionStatus.DRAFT,
      template: {
        fields: [
          { fieldName: "birthday", fieldType: "date_parts" },
          { fieldName: "joined", fieldType: "date", datePartsMapping: { dayField: "joined_day", monthField: "joined_month", yearField: "joined_year" } },
        ],
        originalFileUrl: "http://localhost:9000/bucket/templates/u/template.docx",
        originalFileName: "template.docx",
      },
      formData: {
        birthday: { day: 1, month: 2, year: 2003 },
        joined: "2024-03-15",
      },
      templateId: "template-1",
    }).mockResolvedValueOnce({
      id: "sub-1",
      userId: "user-1",
      status: SubmissionStatus.COMPLETED,
      outputFileUrl: "http://localhost:9000/bucket/submissions/u/output.docx",
      outputFileName: "output.docx",
    }).mockResolvedValueOnce({
      id: "sub-2",
      userId: "user-1",
      status: SubmissionStatus.COMPLETED,
      outputFileUrl: "http://localhost:9000/bucket/submissions/u/output.docx",
      outputFileName: "output.docx",
    });
    (service as any).downloadTemplate = jest.fn().mockResolvedValue(Buffer.from("any-buffer"));
    (service as any).s3Client = { send: jest.fn().mockResolvedValue({}) };

    await service.generateDocument("sub-1");
    expect(saveSpy).toHaveBeenCalled();

    const dl = await service.downloadSubmissionFile("sub-1", "user-1");
    expect(dl.fileName).toBe("output.docx");

    (service as any).s3Client = null;
    await expect(service.getPublicUrl("sub-2", "user-1")).rejects.toBeInstanceOf(InternalServerErrorException);
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

  it("should expose public url cache miss and deletion branches", async () => {
    const service = createService();
    (getSignedUrl as jest.Mock).mockResolvedValue("http://signed-url-new");
    submissionRepository.findOne.mockResolvedValueOnce({
      id: "sub-1",
      userId: "user-1",
      status: SubmissionStatus.COMPLETED,
      outputFileUrl: "http://localhost:9000/bucket/files/output.docx",
      outputFileName: "output.docx",
    }).mockResolvedValueOnce({
      id: "sub-1",
      userId: "user-1",
      status: SubmissionStatus.COMPLETED,
      outputFileUrl: "http://localhost:9000/bucket/files/output.docx",
      outputFileName: "output.docx",
    }).mockResolvedValueOnce(null);

    await service.getPublicUrl("sub-1", "user-1");
    const again = await service.getPublicUrl("sub-1", "user-1");
    expect(again.url).toBe("http://signed-url-new");

    await expect(service.delete("missing", "user-1")).rejects.toBeInstanceOf(NotFoundException);
    submissionRepository.findOne.mockResolvedValueOnce({ id: "sub-1", userId: "user-1", outputFileUrl: "http://localhost:9000/bucket/file.docx" });
    await service.delete("sub-1", "user-1");
    expect(submissionRepository.remove).toHaveBeenCalled();
  });
});