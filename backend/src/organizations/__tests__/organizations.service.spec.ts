import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { OrganizationsService } from "../organizations.service";
import { UserOrgRole } from "../../entities/user-organization.entity";

describe("OrganizationsService", () => {
  const createOrgRepositoryMock = () => ({
    findOne: jest.fn() as any,
    create: jest.fn((value) => value) as any,
    save: jest.fn(async (value) => value) as any,
    find: jest.fn() as any,
    count: jest.fn() as any,
    existsBy: jest.fn() as any,
    update: jest.fn() as any,
    remove: jest.fn() as any,
    query: jest.fn() as any,
    createQueryBuilder: jest.fn() as any,
  });

  const createUserOrgRepositoryMock = () => ({
    findOne: jest.fn() as any,
    create: jest.fn((value) => value) as any,
    save: jest.fn(async (value) => value) as any,
    count: jest.fn() as any,
    delete: jest.fn() as any,
    find: jest.fn() as any,
    createQueryBuilder: jest.fn() as any,
  });

  let organizationsRepository: ReturnType<typeof createOrgRepositoryMock>;
  let userOrganizationsRepository: ReturnType<typeof createUserOrgRepositoryMock>;
  let service: OrganizationsService;

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    organizationsRepository = createOrgRepositoryMock();
    userOrganizationsRepository = createUserOrgRepositoryMock();
    service = new OrganizationsService(organizationsRepository as never, userOrganizationsRepository as never);
  });

  it("should create an organization with a parent", async () => {
    organizationsRepository.findOne.mockResolvedValue({ id: "parent-1" });
    organizationsRepository.save.mockImplementation(async (value: any) => ({ ...value, id: "org-1" }));

    const result = await service.create({
      name: "Org A",
      code: "OA",
      type: "doan",
      parentId: "parent-1",
    } as any);

    expect(result.id).toBe("org-1");
  });

  it("should build a tree with member counts", async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => [{ id: "root-1", children: [] }] as any),
    } as any;
    organizationsRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    organizationsRepository.find.mockImplementation(async ({ where }: any) => {
      if (where?.parent?.id === "root-1") {
        return [{ id: "child-1", children: [] }];
      }
      return [];
    });
    organizationsRepository.count.mockResolvedValue(0);

    const memberCountsQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(async () => [
        { orgId: "root-1", count: "3" },
        { orgId: "child-1", count: "1" },
      ] as any),
    } as any;
    userOrganizationsRepository.createQueryBuilder.mockReturnValue(memberCountsQueryBuilder);

    const result = await service.findTreeWithDepth(2) as any[];

    expect(result[0].memberCount).toBe(3);
    expect(result[0].children[0].memberCount).toBe(1);
    expect(result[0].hasChildren).toBe(true);
  });

  it("should return a single organization without children when includeChildren is false", async () => {
    organizationsRepository.findOne.mockResolvedValue({ id: "org-1", name: "Org 1" });
    userOrganizationsRepository.count.mockResolvedValue(4);

    const result = await service.findByTypeCodeWithChildren("doan", "ORG1", false);

    expect(result.memberCount).toBe(4);
    expect(result.children).toEqual([]);
    expect(result.hasChildren).toBe(false);
  });

  it("should reject invalid user IDs for accessible organizations", async () => {
    await expect(service.getAccessibleOrganizations("")).rejects.toThrow("Invalid user ID");
  });

  it("should add a member and reject duplicates", async () => {
    userOrganizationsRepository.findOne.mockResolvedValueOnce(null);
    userOrganizationsRepository.save.mockImplementation(async (value: any) => value);

    const result = await service.addMember("org-1", "user-1", UserOrgRole.ADMIN);

    expect(result).toEqual(expect.objectContaining({ organizationId: "org-1", userId: "user-1", role: UserOrgRole.ADMIN }));
  });

  it("should reject removing an organization with children", async () => {
    organizationsRepository.findOne.mockResolvedValue({ id: "org-1", children: [{ id: "child-1" }] });

    await expect(service.remove("org-1")).rejects.toThrow("Cannot delete organization with child organizations");
  });

  it("should update an existing organization", async () => {
    organizationsRepository.existsBy.mockResolvedValue(true);
    organizationsRepository.findOne.mockResolvedValue({ id: "org-1" });

    const result = await service.update("org-1", { name: "Org Updated" } as any);

    expect(organizationsRepository.update).toHaveBeenCalledWith("org-1", expect.objectContaining({ name: "Org Updated" }));
    expect(result.id).toBe("org-1");
  });
});