import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { NotFoundException } from "@nestjs/common";
import { ReportsService } from "../reports.service";
import { ParticipationStatus } from "../../../entities/ctxh-participation.entity";

describe("ReportsService", () => {
  const createRepositoryMock = () => ({
    findOne: jest.fn() as any,
    count: jest.fn() as any,
    query: jest.fn() as any,
    createQueryBuilder: jest.fn() as any,
  });

  let activityRepository: ReturnType<typeof createRepositoryMock>;
  let categoryRepository: ReturnType<typeof createRepositoryMock>;
  let participationRepository: ReturnType<typeof createRepositoryMock>;
  let limitConfigRepository: ReturnType<typeof createRepositoryMock>;
  let userRepository: ReturnType<typeof createRepositoryMock>;
  let service: ReportsService;

  beforeEach(() => {
    activityRepository = createRepositoryMock();
    categoryRepository = createRepositoryMock();
    participationRepository = createRepositoryMock();
    limitConfigRepository = createRepositoryMock();
    userRepository = createRepositoryMock();

    service = new ReportsService(
      activityRepository as never,
      categoryRepository as never,
      participationRepository as never,
      limitConfigRepository as never,
      userRepository as never,
    );
  });

  it("should throw not found when student code does not exist", async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.getStudentReportByCode("SV999")).rejects.toThrow(NotFoundException);
  });

  it("should build student report by code with combined old and new ctxh days", async () => {
    userRepository.findOne.mockResolvedValue({
      id: "student-1",
      code: "SV001",
      familyName: "Nguyen",
      givenName: "An",
      email: "an@example.com",
      ctxhDays: "8",
      ctxhDaysOldSystem: "10",
    });

    participationRepository.createQueryBuilder.mockReturnValue({
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(async () => [
        {
          activity_name: "Chiến dịch A",
          category_name: "Tình nguyện",
          actual_days: 5,
          status: "COMPLETED",
          updated_at: new Date(),
          created_at: new Date(),
          note: "ok",
        },
      ]),
    });

    const result = await service.getStudentReportByCode("SV001");

    expect(result.student_code).toBe("SV001");
    expect(result.total_days_completed).toBe(18);
    expect(result.required_days).toBe(15);
    expect(result.is_qualified).toBe(true);
    expect(result.activities).toHaveLength(1);
  });

  it("should build system report with calculated qualification rate", async () => {
    categoryRepository.count.mockResolvedValue(3);
    activityRepository.count.mockResolvedValue(10);
    participationRepository.count
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(12);

    participationRepository.createQueryBuilder
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(async () => [{ student_code: "SV001" }, { student_code: "SV002" }]),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(async () => [
          { studentCode: "SV001", totalDays: 20 },
          { studentCode: "SV002", totalDays: 10 },
        ]),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(async () => ({ total: "30" })),
      });

    categoryRepository.query.mockResolvedValue([
      {
        category_id: "cat-1",
        category_name: "Tình nguyện",
        activities_count: "4",
        participants_count: "15",
        total_days_allocated: "30",
      },
    ]);

    const result = await service.getSystemReport();

    expect(result.total_categories).toBe(3);
    expect(result.total_activities).toBe(10);
    expect(result.total_students_registered).toBe(2);
    expect(result.total_students_qualified).toBe(1);
    expect(result.overall_qualification_rate).toBe(50);
    expect(result.total_days_allocated).toBe(30);
    expect(result.categories_summary[0].category_name).toBe("Tình nguyện");
  });

  it("should build student report by student id (legacy path)", async () => {
    userRepository.findOne.mockResolvedValue({
      id: "student-1",
      code: "SV001",
      familyName: "Tran",
      givenName: "Binh",
      email: "binh@example.com",
      ctxhDays: "7",
      ctxhDaysOldSystem: "2",
    });

    participationRepository.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => [
        {
          activity: { name: "A", category: { name: "B" } },
          actual_days: 3,
          status: ParticipationStatus.COMPLETED,
          updated_at: new Date(),
          note: "ok",
        },
      ]),
    });

    const result = await service.getStudentReport("student-1");

    expect(result.student_id).toBe("student-1");
    expect(result.total_days_completed).toBe(9);
    expect(result.total_activities_participated).toBe(1);
  });
});