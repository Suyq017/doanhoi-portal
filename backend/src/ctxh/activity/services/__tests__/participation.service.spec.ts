import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ParticipationService } from "../participation.service";
import { ActivityStatus } from "../../../../entities/ctxh-activity.entity";
import { ParticipationStatus } from "../../../../entities/ctxh-participation.entity";

describe("ParticipationService", () => {
  const createQB = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getMany: jest.fn(async () => []),
    getCount: jest.fn(async () => 0),
    getRawOne: jest.fn(async () => ({ total: "0" })),
  });

  const createRepoMock = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => ({ ...v, id: "p1" })),
    update: jest.fn(async () => undefined),
    createQueryBuilder: jest.fn(() => createQB()),
    query: jest.fn(),
  });

  let participationRepository: ReturnType<typeof createRepoMock>;
  let activityRepository: ReturnType<typeof createRepoMock>;
  let userRepository: ReturnType<typeof createRepoMock>;
  let service: ParticipationService;

  beforeEach(() => {
    participationRepository = createRepoMock();
    activityRepository = createRepoMock();
    userRepository = createRepoMock();

    service = new ParticipationService(
      participationRepository as never,
      activityRepository as never,
      userRepository as never,
    );
  });

  it("should reject self registration when activity not found", async () => {
    activityRepository.findOne.mockResolvedValue(null);

    await expect(service.registerSelf("a1", "u1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("should reject self registration when activity is not active", async () => {
    activityRepository.findOne.mockResolvedValue({ id: "a1", status: ActivityStatus.DRAFT });

    await expect(service.registerSelf("a1", "u1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("should map student details when finding by activity", async () => {
    participationRepository.createQueryBuilder.mockReturnValueOnce({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => [{ id: "p1", student_code: "2150001" }]),
    });
    userRepository.createQueryBuilder.mockReturnValueOnce({
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => [
        {
          id: "u1",
          code: "2150001",
          familyName: "Nguyen",
          givenName: "A",
          email: "a@test.com",
        },
      ]),
    });

    const result = await service.findByActivity("a1");
    expect(result).toHaveLength(1);
    expect(result[0].student.student_code).toBe("2150001");
  });

  it("should map pending participations by activity", async () => {
    participationRepository.createQueryBuilder.mockReturnValueOnce({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => [
        { id: "p1", student_code: "2150001", status: ParticipationStatus.PENDING },
      ]),
    });
    userRepository.createQueryBuilder.mockReturnValueOnce({
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => [
        {
          id: "u1",
          code: "2150001",
          familyName: "Nguyen",
          givenName: "A",
          email: "a@test.com",
        },
      ]),
    });

    const result = await service.findPendingByActivity("a1");
    expect(result).toHaveLength(1);
    expect(result[0].student.student_code).toBe("2150001");
  });

  it("should register self successfully", async () => {
    activityRepository.findOne.mockResolvedValue({
      id: "a1",
      status: ActivityStatus.ACTIVE,
      requires_approval: false,
      max_participants: 10,
    });
    userRepository.findOne.mockResolvedValue({
      id: "u1",
      code: "2150001",
      familyName: "Nguyen",
      givenName: "A",
      email: "a@test.com",
    });
    participationRepository.findOne.mockResolvedValue(null);

    const result = await service.registerSelf("a1", "u1");

    expect(result).toBeDefined();
    expect(participationRepository.save).toHaveBeenCalled();
  });

  it("should reject self registration when capacity is full", async () => {
    activityRepository.findOne.mockResolvedValue({
      id: "a1",
      status: ActivityStatus.ACTIVE,
      requires_approval: false,
      max_participants: 1,
    });
    userRepository.findOne.mockResolvedValue({
      id: "u1",
      code: "2150001",
      familyName: "Nguyen",
      givenName: "A",
      email: "a@test.com",
    });
    participationRepository.findOne.mockResolvedValue(null);
    participationRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(async () => 1),
    });

    await expect(service.registerSelf("a1", "u1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("should reject self registration when user has no valid student code", async () => {
    activityRepository.findOne.mockResolvedValue({
      id: "a1",
      status: ActivityStatus.ACTIVE,
      requires_approval: false,
      max_participants: 10,
    });
    userRepository.findOne.mockResolvedValue({ id: "u1", code: null });

    await expect(service.registerSelf("a1", "u1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("should reject addStudent when student not found", async () => {
    activityRepository.findOne.mockResolvedValue({ id: "a1", status: ActivityStatus.ACTIVE });
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.addStudent("a1", "2150999", "admin1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("should reject approveParticipation when activity does not require approval", async () => {
    activityRepository.findOne.mockResolvedValue({ id: "a1", requires_approval: false });

    await expect(
      service.approveParticipation("a1", "p1", "admin1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should reject cancel self registration when participation does not exist", async () => {
    participationRepository.findOne.mockResolvedValue(null);

    await expect(
      service.cancelSelfRegistration("a1", "u1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("should reject addStudent when activity does not exist", async () => {
    activityRepository.findOne.mockResolvedValue(null);

    await expect(
      service.addStudent("a1", "2150001", "admin1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("should reject addStudent when activity is not active", async () => {
    activityRepository.findOne.mockResolvedValue({ id: "a1", status: ActivityStatus.DRAFT });

    await expect(
      service.addStudent("a1", "2150001", "admin1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should reject approveParticipation when activity does not exist", async () => {
    activityRepository.findOne.mockResolvedValue(null);

    await expect(
      service.approveParticipation("a1", "p1", "admin1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("should approve pending participation", async () => {
    activityRepository.findOne.mockResolvedValue({
      id: "a1",
      requires_approval: true,
      max_participants: 10,
    });
    participationRepository.findOne
      .mockResolvedValueOnce({ id: "p1", status: ParticipationStatus.PENDING, activity_id: "a1" })
      .mockResolvedValueOnce({ id: "p1", status: ParticipationStatus.APPROVED });

    const result = await service.approveParticipation("a1", "p1", "admin1");
    expect(result).toBeDefined();
    expect(participationRepository.update).toHaveBeenCalled();
  });

  it("should reject approve when participation is not pending", async () => {
    activityRepository.findOne.mockResolvedValue({
      id: "a1",
      requires_approval: true,
      max_participants: 10,
    });
    participationRepository.findOne.mockResolvedValue({
      id: "p1",
      status: ParticipationStatus.APPROVED,
      activity_id: "a1",
    });

    await expect(
      service.approveParticipation("a1", "p1", "admin1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should reject approve when participation does not exist", async () => {
    activityRepository.findOne.mockResolvedValue({
      id: "a1",
      requires_approval: true,
      max_participants: 10,
    });
    participationRepository.findOne.mockResolvedValue(null);

    await expect(
      service.approveParticipation("a1", "p1", "admin1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("should cancel self registration only when pending", async () => {
    participationRepository.findOne
      .mockResolvedValueOnce({ id: "p1", status: ParticipationStatus.APPROVED })
      .mockResolvedValueOnce({ id: "p2", status: ParticipationStatus.PENDING });

    await expect(
      service.cancelSelfRegistration("a1", "u1"),
    ).rejects.toBeInstanceOf(BadRequestException);

    await service.cancelSelfRegistration("a1", "u1");
    expect(participationRepository.update).toHaveBeenCalledWith(
      "p2",
      expect.objectContaining({ deleted_by: "u1" }),
    );
  });

  it("should reject addStudent when student already participated", async () => {
    activityRepository.findOne.mockResolvedValue({ id: "a1", status: ActivityStatus.ACTIVE });
    userRepository.findOne.mockResolvedValue({ id: "u1", code: "2150001" });
    participationRepository.findOne.mockResolvedValue({ id: "existing" });

    await expect(
      service.addStudent("a1", "2150001", "admin1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should add multiple students with mixed success and failure", async () => {
    activityRepository.findOne.mockResolvedValue({
      id: "a1",
      status: ActivityStatus.ACTIVE,
      max_participants: 10,
    });
    participationRepository.find.mockResolvedValue([{ student_code: "2150002" }]);
    userRepository.findOne
      .mockResolvedValueOnce({ id: "u1", code: "2150001", familyName: "N", givenName: "A", email: "a@test.com" })
      .mockResolvedValueOnce(null);

    const result = await service.addMultipleStudents(
      "a1",
      ["2150001", "2150002", "2150999"],
      "admin1",
    );

    expect(result.successful).toHaveLength(1);
    expect(result.failed).toHaveLength(2);
  });

  it("should grade participation and update user ctxh days", async () => {
    participationRepository.findOne
      .mockResolvedValueOnce({ id: "p1", student_code: "2150001", actual_days: 2 })
      .mockResolvedValueOnce({ id: "p1", student_code: "2150001", student_id: "u1", actual_days: 5 });
    userRepository.query
      .mockResolvedValueOnce([{ id: "u1", code: "2150001", ctxh_days: "10" }])
      .mockResolvedValueOnce(undefined);

    const result = await service.gradeParticipation("p1", 5, "ok", "admin1");

    expect(result).toBeDefined();
    expect(participationRepository.update).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ actual_days: 5, status: ParticipationStatus.COMPLETED }),
    );
    expect(userRepository.query).toHaveBeenCalled();
  });

  it("should remove participant and subtract graded days", async () => {
    participationRepository.findOne.mockResolvedValue({
      id: "p1",
      student_code: "2150001",
      actual_days: 3,
    });
    userRepository.query
      .mockResolvedValueOnce([{ id: "u1", code: "2150001", ctxh_days: "10" }])
      .mockResolvedValueOnce(undefined);

    await service.removeParticipant("p1", "admin1");

    expect(participationRepository.update).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ deleted_by: "admin1" }),
    );
  });

  it("should approve participations in batch and collect failures", async () => {
    const approveSpy = jest
      .spyOn(service, "approveParticipation")
      .mockResolvedValueOnce({ id: "p1" } as never)
      .mockRejectedValueOnce(new Error("not pending"));

    const result = await service.approveParticipationsBatch(
      "a1",
      ["p1", "p2"],
      "admin1",
    );

    expect(approveSpy).toHaveBeenCalledTimes(2);
    expect(result.successful).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
  });

  it("should bulk grade from excel with mixed outcomes", async () => {
    activityRepository.findOne.mockResolvedValue({ id: "a1" });
    participationRepository.findOne
      .mockResolvedValueOnce({ id: "p1", actual_days: 1 })
      .mockResolvedValueOnce(null);
    userRepository.query
      .mockResolvedValueOnce([{ id: "u1", code: "2150001", ctxh_days: "4" }])
      .mockResolvedValueOnce(undefined);

    const result = await service.bulkGradeFromExcel(
      "a1",
      [
        { studentCode: "2150001", actualDays: 3, note: "ok" },
        { studentCode: "2150999", actualDays: 2, note: "missing" },
      ],
      "admin1",
    );

    expect(result.successful).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
  });

  it("should reject bulk grading when activity is not found", async () => {
    activityRepository.findOne.mockResolvedValue(null);

    await expect(
      service.bulkGradeFromExcel(
        "a1",
        [{ studentCode: "2150001", actualDays: 2, note: "ok" }],
        "admin1",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});