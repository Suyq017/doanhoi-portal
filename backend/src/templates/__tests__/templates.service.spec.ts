import PizZip from "pizzip";
import { S3Client } from "@aws-sdk/client-s3";
import { TemplatesService } from "../templates.service";
import { TemplateStatus } from "../../entities/template.entity";
import { BadRequestException, InternalServerErrorException, NotFoundException } from "@nestjs/common";

describe("TemplatesService", () => {
  const createTemplateRepositoryMock = () => ({
    create: jest.fn((value) => value),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
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

  it("should parse a template without placeholders", async () => {
    const service = createService();
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    const result = await service.parseTemplate(createDocxBuffer("plain text only"));

    expect(result.placeholders).toEqual([]);
    expect(result.totalFields).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("should reject invalid docx buffers", async () => {
    const service = createService();

    await expect(service.parseTemplate(Buffer.from("not-a-docx"))).rejects.toBeInstanceOf(BadRequestException);
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

  it("should reject upload when file is not docx", async () => {
    const service = createService();

    await expect(
      service.uploadTemplate(
        { originalname: "form.txt", buffer: Buffer.from("x"), size: 1 } as Express.Multer.File,
        { name: "Form A", description: "Desc", organizationId: "org-1" } as never,
        "user-1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should fail upload when S3 config is unavailable", async () => {
    const service = createService();
    (service as any).s3Client = null;
    (service as any).s3Config = null;
    jest.spyOn(service as any, "initializeS3Client").mockResolvedValue(undefined);

    await expect(
      service.uploadTemplate(
        { originalname: "form.docx", buffer: Buffer.from("x"), size: 1 } as Express.Multer.File,
        { name: "Form A", description: "Desc", organizationId: "org-1" } as never,
        "user-1",
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it("should return not found and update template branches", async () => {
    const service = createService();
    templateRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "template-1", name: "Old" }).mockResolvedValueOnce({ id: "template-1", name: "Updated" });
    templateRepository.save.mockImplementation(async (value) => value);

    await expect(service.findOne("missing")).rejects.toBeInstanceOf(NotFoundException);

    const updated = await service.update("template-1", { name: "Updated" } as never);
    expect(updated.name).toBe("Updated");
  });

  it("should find all templates with filters and configure fields", async () => {
    const service = createService();
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      loadRelationCountAndMap: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{ id: "t-1" }], 1]),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    templateRepository.createQueryBuilder.mockReturnValue(qb);
    templateRepository.findOne.mockResolvedValue({ id: "template-1" });
    templateFieldRepository.save.mockResolvedValue([]);
    templateFieldRepository.create.mockImplementation((v) => v);

    const list = await service.findAll("active", "form", 2, 5);
    expect(list.total).toBe(1);
    expect(qb.andWhere).toHaveBeenCalled();

    jest.spyOn(service as any, "findOne").mockResolvedValue({ id: "template-1" });
    templateRepository.delete.mockResolvedValue(undefined);
    const configured = await service.configureFields("template-1", { fields: [{ fieldName: "name" }] } as never);
    expect(configured.id).toBe("template-1");
    expect(templateFieldRepository.delete).toHaveBeenCalledWith({ templateId: "template-1" });
  });

  it("should delete template and ignore S3 deletion failure", async () => {
    const service = createService();
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    templateRepository.findOne.mockResolvedValue({
      id: "template-1",
      originalFileUrl: "http://localhost:9000/bucket/templates/u/file.docx",
      submissions: [],
    });
    (service as any).s3Client = { send: jest.fn().mockRejectedValue(new Error("s3 down")) };

    await expect(service.delete("template-1")).resolves.toBeUndefined();
    expect(templateRepository.remove).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("should reject deleting a template with submissions", async () => {
    const service = createService();
    templateRepository.findOne.mockResolvedValue({ id: "template-1", submissions: [{ id: "sub-1" }] });

    await expect(service.delete("template-1")).rejects.toThrow("TEMPLATE_HAS_SUBMISSIONS");
  });
});