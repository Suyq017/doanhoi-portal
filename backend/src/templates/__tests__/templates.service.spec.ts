import PizZip from "pizzip";
import { S3Client } from "@aws-sdk/client-s3";
import { TemplatesService } from "../templates.service";
import { TemplateStatus } from "../../entities/template.entity";

describe("TemplatesService", () => {
  const createTemplateRepositoryMock = () => ({
    create: jest.fn((value) => value),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
  });

  const createTemplateFieldRepositoryMock = () => ({
    create: jest.fn((value) => value),
    save: jest.fn(),
    delete: jest.fn(),
  });

  const createAwsConfigServiceMock = () => ({
    getActiveConfig: jest.fn(),
  });

  let templateRepository: ReturnType<typeof createTemplateRepositoryMock>;
  let templateFieldRepository: ReturnType<typeof createTemplateFieldRepositoryMock>;
  let awsConfigService: ReturnType<typeof createAwsConfigServiceMock>;

  beforeEach(() => {
    jest.spyOn(TemplatesService.prototype as any, "initializeS3Client").mockResolvedValue(undefined);
    templateRepository = createTemplateRepositoryMock();
    templateFieldRepository = createTemplateFieldRepositoryMock();
    awsConfigService = createAwsConfigServiceMock();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createService = () => {
    const service = new TemplatesService(
      templateRepository as never,
      templateFieldRepository as never,
      awsConfigService as never,
    );

    (service as any).s3Config = {
      s3Bucket: "bucket",
      s3Endpoint: "http://localhost:9000",
    };
    (service as any).s3Client = { send: jest.fn().mockResolvedValue({}) };

    return service;
  };

  const createDocxBuffer = (text: string) => {
    const zip = new PizZip();
    zip.file("word/document.xml", `<w:document>${text}</w:document>`);
    return zip.generate({ type: "nodebuffer" });
  };

  it("should parse placeholders from docx buffer", async () => {
    const service = createService();
    const result = await service.parseTemplate(createDocxBuffer("{{name}} {{name}} {{dob}}"));

    expect(result.placeholders).toEqual(["name", "dob"]);
    expect(result.placeholderCounts).toEqual({ name: 2, dob: 1 });
    expect(result.totalFields).toBe(2);
  });

  it("should upload template, create fields and return saved entity", async () => {
    const service = createService();
    jest.spyOn(service, "parseTemplate").mockResolvedValue({ placeholders: ["name", "dob"] });
    templateRepository.save.mockResolvedValue({ id: "template-1" });
    templateRepository.findOne.mockResolvedValue({ id: "template-1", status: TemplateStatus.PROCESSING });

    const result = await service.uploadTemplate(
      {
        originalname: "form.docx",
        buffer: Buffer.from("docx"),
        size: 4,
      } as Express.Multer.File,
      { name: "Form A", description: "Desc", organizationId: "org-1" } as never,
      "user-1",
    );

    expect(templateRepository.create).toHaveBeenCalled();
    expect(templateFieldRepository.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: "template-1", status: TemplateStatus.PROCESSING });
  });

  it("should reject deleting a template with submissions", async () => {
    const service = createService();
    templateRepository.findOne.mockResolvedValue({ id: "template-1", submissions: [{ id: "sub-1" }] });

    await expect(service.delete("template-1")).rejects.toThrow("TEMPLATE_HAS_SUBMISSIONS");
  });
});