import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ClassesService } from "../classes.service";

describe("ClassesService", () => {
  const createClassesRepositoryMock = () => ({
    findOne: jest.fn() as any,
    create: jest.fn((value) => value) as any,
    save: jest.fn(async (value) => value) as any,
    remove: jest.fn() as any,
    find: jest.fn() as any,
    createQueryBuilder: jest.fn() as any,
  });

  const createDepartmentsRepositoryMock = () => ({
    findOne: jest.fn() as any,
  });

  let classesRepository: ReturnType<typeof createClassesRepositoryMock>;
  let departmentsRepository: ReturnType<typeof createDepartmentsRepositoryMock>;
  let service: ClassesService;

  beforeEach(() => {
    classesRepository = createClassesRepositoryMock();
    departmentsRepository = createDepartmentsRepositoryMock();
    service = new ClassesService(classesRepository as never, departmentsRepository as never);
  });

  it("should create a class and validate department", async () => {
    classesRepository.findOne.mockResolvedValue(null);
    departmentsRepository.findOne.mockResolvedValue({ id: "dept-1" });

    const result = await service.create({
      name: "Class A",
      departmentId: "dept-1",
    } as any);

    expect(result).toEqual(expect.objectContaining({ name: "Class A", departmentId: "dept-1" }));
  });

  it("should reject create when department is missing", async () => {
    classesRepository.findOne.mockResolvedValue(null);
    departmentsRepository.findOne.mockResolvedValue(null);

    await expect(service.create({ name: "Class A", departmentId: "dept-1" } as any)).rejects.toThrow(
      "Department not found",
    );
  });

  it("should reject duplicate class names", async () => {
    classesRepository.findOne.mockResolvedValue({ id: "class-1" });

    await expect(service.create({ name: "Class A" } as any)).rejects.toThrow(
      "Class with this name already exists",
    );
  });

  it("should filter classes in findAll", async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[{ id: "class-1" }], 1] as any),
    } as any;
    classesRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findAll({
      page: 2,
      limit: 5,
      search: "A",
      year: 2024,
      departmentId: "dept-1",
      isActive: true,
    } as any);

    expect(queryBuilder.andWhere).toHaveBeenCalledTimes(3);
    expect(queryBuilder.skip).toHaveBeenCalledWith(5);
    expect(result.total).toBe(1);
  });

  it("should return default filtered result without optional filters", async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[{ id: "class-1" }], 1] as any),
    } as any;
    classesRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findAll({ page: 1, limit: 10 } as any);

    expect(queryBuilder.where).not.toHaveBeenCalled();
    expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    expect(result.classes).toHaveLength(1);
  });

  it("should throw when findOne cannot locate a class", async () => {
    classesRepository.findOne.mockResolvedValueOnce(null);

    await expect(service.findOne("missing")).rejects.toThrow("Class not found");
  });

  it("should block removing classes with students", async () => {
    classesRepository.findOne.mockResolvedValue({ id: "class-1", students: [{ id: "student-1" }] });

    await expect(service.remove("class-1")).rejects.toThrow(
      "Cannot delete class with students. Please move students first.",
    );
  });

  it("should remove an empty class and reject missing class removal", async () => {
    classesRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "class-1", students: [] });

    await expect(service.remove("missing")).rejects.toThrow("Class not found");
    await service.remove("class-1");
    expect(classesRepository.remove).toHaveBeenCalled();
  });

  it("should update class and validate duplicate name/department", async () => {
    classesRepository.findOne
      .mockResolvedValueOnce({ id: "class-1", name: "Old", students: [] })
      .mockResolvedValueOnce(null);
    departmentsRepository.findOne.mockResolvedValue({ id: "dept-1" });

    const result = await service.update("class-1", {
      name: "New",
      departmentId: "dept-1",
    } as any);

    expect(result.name).toBe("New");

    classesRepository.findOne
      .mockResolvedValueOnce({ id: "class-1", name: "Old", students: [] })
      .mockResolvedValueOnce({ id: "class-2", name: "Taken" });

    await expect(service.update("class-1", { name: "Taken" } as any)).rejects.toThrow(
      "Class with this name already exists",
    );
  });

  it("should reject update when department is missing", async () => {
    classesRepository.findOne.mockResolvedValue({ id: "class-1", name: "Old", students: [] });
    departmentsRepository.findOne.mockResolvedValue(null);

    await expect(service.update("class-1", { departmentId: "dept-1" } as any)).rejects.toThrow(
      "Department not found",
    );
  });

  it("should reject bulk delete when classes are missing", async () => {
    classesRepository.find.mockResolvedValue([{ id: "class-1", students: [] }]);

    await expect(service.bulkDelete(["class-1", "class-2"])).rejects.toThrow(
      "Some classes not found",
    );
  });

  it("should allow bulk delete for empty id list", async () => {
    classesRepository.find.mockResolvedValue([]);

    await expect(service.bulkDelete([])).resolves.toBeUndefined();
    expect(classesRepository.remove).toHaveBeenCalledWith([]);
  });

  it("should reject bulk delete when any class has students", async () => {
    classesRepository.find.mockResolvedValue([
      { id: "class-1", name: "A", students: [] },
      { id: "class-2", name: "B", students: [{ id: "student-1" }] },
    ]);

    await expect(service.bulkDelete(["class-1", "class-2"])).rejects.toThrow(
      "Cannot delete classes with students: B",
    );
  });

  it("should bulk delete classes when all are empty", async () => {
    classesRepository.find.mockResolvedValue([
      { id: "class-1", name: "Class 1", students: [] },
      { id: "class-2", name: "Class 2", students: [] },
    ]);

    await service.bulkDelete(["class-1", "class-2"]);

    expect(classesRepository.remove).toHaveBeenCalled();
  });
});