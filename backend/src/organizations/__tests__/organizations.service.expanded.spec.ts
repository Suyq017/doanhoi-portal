import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { OrganizationsService } from "../organizations.service";
import { OrganizationType } from "../../entities/organization.entity";
import { UserOrgRole } from "../../entities/user-organization.entity";

describe("OrganizationsService expanded coverage", () => {
  const createOrgRepositoryMock = () => ({
    findOne: jest.fn() as any,
    create: jest.fn((value) => value) as any,
    save: jest.fn(async (value) => value) as any,
    find: jest.fn() as any,
    findTrees: jest.fn() as any,
    count: jest.fn() as any,
    existsBy: jest.fn() as any,
    update: jest.fn() as any,
    remove: jest.fn() as any,
    query: jest.fn() as any,
    createQueryBuilder: jest.fn() as any,
    manager: {
      getRepository: jest.fn() as any,
      getTreeRepository: jest.fn() as any,
    },
  });

  const createUserOrgRepositoryMock = () => ({
    findOne: jest.fn() as any,
    create: jest.fn((value) => value) as any,
    save: jest.fn(async (value) => value) as any,
    count: jest.fn() as any,
    delete: jest.fn() as any,
    remove: jest.fn() as any,
    find: jest.fn() as any,
    findAndCount: jest.fn() as any,
    createQueryBuilder: jest.fn() as any,
  });

  const createQueryBuilderMock = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn() as any,
    getRawMany: jest.fn() as any,
    getRawOne: jest.fn() as any,
    getCount: jest.fn() as any,
  });

  let organizationsRepository: any;
  let userOrganizationsRepository: any;
  let service: OrganizationsService;
  let userRepository: any;
  let treeRepository: any;

  beforeEach(() => {
    organizationsRepository = createOrgRepositoryMock();
    userOrganizationsRepository = createUserOrgRepositoryMock();
    userRepository = {
      findOne: jest.fn() as any,
    };
    treeRepository = {
      findOne: jest.fn() as any,
      findDescendants: jest.fn() as any,
    };

    organizationsRepository.manager.getRepository.mockReturnValue(userRepository);
    organizationsRepository.manager.getTreeRepository.mockReturnValue(treeRepository);

    service = new OrganizationsService(
      organizationsRepository as never,
      userOrganizationsRepository as never,
    );
  });

  it("covers create and find methods", async () => {
    organizationsRepository.create.mockImplementation((value: any) => ({ ...value, id: "org-1" }));
    organizationsRepository.save.mockImplementation(async (value: any) => value);

    const created = await service.create({
      name: "Org A",
      code: "OA",
      type: OrganizationType.DOAN_TRUONG,
    } as any);
    expect(created.id).toBe("org-1");

    organizationsRepository.findOne.mockResolvedValueOnce(null);
    await expect(
      service.create({
        name: "Org B",
        code: "OB",
        type: OrganizationType.DOAN_CO_SO,
        parentId: "missing-parent",
      } as any),
    ).rejects.toThrow("Parent organization not found");

    organizationsRepository.find.mockResolvedValueOnce([{ id: "o-2" }]);
    await expect(service.findAll()).resolves.toEqual([{ id: "o-2" }]);

    organizationsRepository.find.mockResolvedValueOnce([{ id: "o-3" }]);
    await expect(service.findByType(OrganizationType.CLB_TRUONG)).resolves.toEqual([{ id: "o-3" }]);
  });

  it("covers tree and depth helpers", async () => {
    organizationsRepository.findTrees.mockResolvedValueOnce([
      {
        id: "root",
        name: "Root",
        children: [{ id: "child", name: "Child", children: [] }],
      },
    ]);

    const treeCountsQuery = createQueryBuilderMock();
    treeCountsQuery.getRawMany.mockResolvedValueOnce([
      { orgId: "root", count: "2" },
      { orgId: "child", count: "1" },
    ]);
    userOrganizationsRepository.createQueryBuilder.mockReturnValue(treeCountsQuery as any);

    const tree: any = await service.findTree();
    expect(tree[0].memberCount).toBe(2);
    expect(tree[0].children[0].memberCount).toBe(1);
    expect(tree[0].hasChildren).toBe(true);

    const rootQuery = createQueryBuilderMock();
    rootQuery.getMany.mockResolvedValueOnce([
      { id: "root", name: "Root", children: [] },
    ]);
    organizationsRepository.createQueryBuilder.mockReturnValue(rootQuery as any);
    organizationsRepository.find.mockImplementation(async ({ where }: any) => {
      if (where?.parent?.id === "root") {
        return [{ id: "child", name: "Child", children: [] }];
      }
      return [];
    });
    organizationsRepository.count.mockResolvedValue(1);
    treeCountsQuery.getRawMany.mockResolvedValueOnce([{ orgId: "root", count: "5" }]);

    const limitedTree: any = await service.findTreeWithDepth(1);
    expect(limitedTree[0].hasChildren).toBe(false);
    expect(limitedTree[0].children).toEqual([]);

    rootQuery.getMany.mockResolvedValueOnce([
      { id: "root", name: "Root", children: [] },
    ]);
    treeCountsQuery.getRawMany.mockResolvedValueOnce([
      { orgId: "root", count: "5" },
      { orgId: "child", count: "1" },
    ]);
    const recursiveTree: any = await service.findTreeWithDepth(2);
    expect(recursiveTree[0].children[0].memberCount).toBe(1);
    expect(organizationsRepository.find).toHaveBeenCalledWith({
      where: { parent: { id: "root" } },
      order: { name: "ASC" },
    });
  });

  it("covers tree lookup by type/code", async () => {
    organizationsRepository.findOne.mockResolvedValueOnce({
      id: "org-1",
      name: "Org 1",
      type: OrganizationType.DOAN_TRUONG,
      code: "ORG1",
      children: [],
    });
    organizationsRepository.count.mockResolvedValue(0);
    userOrganizationsRepository.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: (jest.fn() as any).mockResolvedValue([{ orgId: "org-1", count: "3" }]),
    } as any);

    await expect(
      service.findTreeByTypeCode(OrganizationType.DOAN_TRUONG, "ORG1", 1),
    ).resolves.toMatchObject({ id: "org-1", memberCount: 3 });

    organizationsRepository.findOne.mockResolvedValueOnce({
      id: "org-1",
      name: "Org 1",
      type: OrganizationType.DOAN_TRUONG,
      code: "ORG1",
      children: [],
    });
    userOrganizationsRepository.count.mockResolvedValueOnce(0);
    await expect(
      service.findByTypeCodeWithChildren(OrganizationType.DOAN_TRUONG, "ORG1", false),
    ).resolves.toMatchObject({ id: "org-1", memberCount: 0, children: [] });

    organizationsRepository.findOne.mockResolvedValueOnce(null);
    await expect(
      service.findTreeByTypeCode(OrganizationType.DOAN_TRUONG, "MISSING", 1),
    ).rejects.toThrow("not found");
  });

  it("covers accessible organization flows", async () => {
    await expect(service.getAccessibleOrganizations("")).rejects.toThrow("Invalid user ID");

    organizationsRepository.query.mockResolvedValueOnce([{ id: "super" }]);
    organizationsRepository.find.mockResolvedValueOnce([{ id: "all" }]);
    await expect(service.getAccessibleOrganizations("user-1")).resolves.toEqual([{ id: "all" }]);

    organizationsRepository.query.mockResolvedValueOnce([]);
    organizationsRepository.query.mockResolvedValueOnce([{ id: "org-1" }, { id: "org-2" }]);
    organizationsRepository.find.mockResolvedValueOnce([{ id: "org-1" }, { id: "org-2" }]);
    await expect(service.getAccessibleOrganizations("user-2")).resolves.toEqual([{ id: "org-1" }, { id: "org-2" }]);

    organizationsRepository.query.mockResolvedValueOnce([]);
    organizationsRepository.query.mockResolvedValueOnce([]);
    await expect(service.getAccessibleOrganizations("user-3")).resolves.toEqual([]);
  });

  it("covers update, remove, and member lifecycle", async () => {
    organizationsRepository.existsBy.mockResolvedValueOnce(true);
    organizationsRepository.update.mockResolvedValueOnce({ affected: 1 });
    organizationsRepository.findOne.mockResolvedValueOnce({ id: "org-1" });
    await expect(service.update("org-1", { name: "Updated" } as any)).resolves.toEqual({ id: "org-1" });

    organizationsRepository.existsBy.mockResolvedValueOnce(false);
    await expect(service.update("missing", { name: "X" } as any)).rejects.toThrow("Organization not found");

    organizationsRepository.existsBy.mockResolvedValueOnce(true);
    organizationsRepository.existsBy.mockResolvedValueOnce(false);
    await expect(service.update("org-2", { parentId: "missing-parent" } as any)).rejects.toThrow("Parent organization not found");

    organizationsRepository.findOne.mockResolvedValueOnce({ id: "org-3", children: [] });
    organizationsRepository.remove.mockResolvedValueOnce({ id: "org-3" });
    await expect(service.remove("org-3")).resolves.toBeUndefined();

    organizationsRepository.findOne.mockResolvedValueOnce({ id: "org-4", children: [{ id: "child" }] });
    await expect(service.remove("org-4")).rejects.toThrow("Cannot delete organization with child organizations");

    userOrganizationsRepository.findOne.mockResolvedValueOnce(null);
    userOrganizationsRepository.create.mockImplementation((value: any) => value);
    userOrganizationsRepository.save.mockImplementation(async (value: any) => value);
    await expect(service.addMember("org-5", "user-5", UserOrgRole.ADMIN)).resolves.toMatchObject({
      organizationId: "org-5",
      userId: "user-5",
      role: UserOrgRole.ADMIN,
    });

    userOrganizationsRepository.findOne.mockResolvedValueOnce({ id: "existing" });
    await expect(service.addMember("org-5", "user-5")).rejects.toThrow("already a member");
  });

  it("covers recursive and safe member removal", async () => {
    userOrganizationsRepository.findOne
      .mockResolvedValueOnce({ id: "membership", organizationId: "org-1", userId: "user-1" })
      .mockResolvedValueOnce({ id: "parent-membership", organizationId: "parent-1", userId: "user-1" });
    userOrganizationsRepository.find.mockResolvedValueOnce([]);
    userOrganizationsRepository.remove.mockResolvedValue({});
    organizationsRepository.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    organizationsRepository.findOne
      .mockResolvedValueOnce({ id: "org-1", parent: { id: "parent-1" } })
      .mockResolvedValueOnce({ id: "parent-1", parent: null });

    await expect(service.removeMemberSafely("org-1", "user-1")).resolves.toBeUndefined();
    expect(userOrganizationsRepository.remove).toHaveBeenCalled();

    userOrganizationsRepository.findOne.mockResolvedValueOnce({ id: "membership", organizationId: "org-2", userId: "user-2" });
    organizationsRepository.find.mockResolvedValueOnce([]);
    await expect(service.removeMember("org-2", "user-2")).resolves.toBeUndefined();

    await expect(service.bulkRemoveMembers("org-3", [])).rejects.toThrow("No user IDs provided");
    organizationsRepository.findOne.mockResolvedValueOnce({ id: "org-3", children: [] });
    const removeMemberSpy = jest.spyOn(service as any, "removeMember").mockResolvedValue(undefined);
    await expect(service.bulkRemoveMembers("org-3", ["u1", "u2"])).resolves.toBeUndefined();
    expect(removeMemberSpy).toHaveBeenCalledTimes(2);
  });

  it("covers member listing, child lookup, stats, and simple code lookups", async () => {
    userOrganizationsRepository.findAndCount.mockResolvedValueOnce([[{ id: "m1" }], 1]);
    await expect(service.getMembers("org-1", 2, 5)).resolves.toEqual({
      members: [{ id: "m1" }],
      total: 1,
      page: 2,
      limit: 5,
      totalPages: 1,
    });

    organizationsRepository.findOne.mockResolvedValueOnce(null);
    await expect(service.findChildren("missing")).rejects.toThrow("Organization not found");

    organizationsRepository.findOne.mockResolvedValueOnce({ id: "org-1" });
    organizationsRepository.find.mockResolvedValueOnce([{ id: "child-1" }]);
    userOrganizationsRepository.createQueryBuilder.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: (jest.fn() as any).mockResolvedValue([{ orgId: "child-1", count: "4" }]),
    } as any);
    organizationsRepository.count.mockResolvedValueOnce(1);
    await expect(service.findChildren("org-1")).resolves.toEqual([
      expect.objectContaining({ id: "child-1", memberCount: 4, hasChildren: true }),
    ]);

    const orgStatsQB = createQueryBuilderMock();
    orgStatsQB.getRawOne
      .mockResolvedValueOnce({
        doanTruong: "1",
        doanCoSo: "2",
        chiDoan: "3",
        hoiSinhVienTruong: "4",
        lienChiHoi: "5",
        chiHoi: "6",
        clbTruong: "7",
        clbKhoa: "8",
      })
      .mockResolvedValueOnce({
        totalMembers: "20",
        doanTruongMembers: "2",
        doanCoSoMembers: "3",
        chiDoanMembers: "4",
        totalDoanMembers: "9",
        hoiSinhVienTruongMembers: "1",
        lienChiHoiMembers: "2",
        chiHoiMembers: "3",
        totalHoiMembers: "6",
        clbTruongMembers: "4",
        clbKhoaMembers: "5",
        totalClbMembers: "9",
      });
    organizationsRepository.createQueryBuilder.mockReturnValueOnce(orgStatsQB as any);
    userOrganizationsRepository.createQueryBuilder.mockReturnValueOnce(orgStatsQB as any);
    await expect(service.getStats()).resolves.toMatchObject({
      doanStats: { total: 6, members: { total: 9 } },
      hoiStats: { total: 15, members: { total: 6 } },
      clbStats: { total: 15, members: { total: 9 } },
      totalMembers: 20,
    });

    organizationsRepository.findOne.mockResolvedValueOnce({
      id: "org-1",
      name: "Org 1",
      type: OrganizationType.DOAN_TRUONG,
      code: "ORG1",
      children: [],
    });
    userOrganizationsRepository.createQueryBuilder.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: (jest.fn() as any).mockResolvedValue([{ orgId: "org-1", count: "2" }]),
    } as any);
    await expect(service.getOrganizationByTypeAndCode(OrganizationType.DOAN_TRUONG, "ORG1")).resolves.toMatchObject({
      id: "org-1",
      memberCount: 2,
    });
  });

  it("covers code import and validation helpers", async () => {
    organizationsRepository.findOne.mockResolvedValueOnce({
      id: "org-1",
      code: "ORG1",
      name: "Org 1",
      parent: { id: "parent-1", name: "Parent 1" },
    });
    userRepository.findOne.mockResolvedValueOnce({ id: "user-1", code: "U1" } as any);
    userOrganizationsRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    userOrganizationsRepository.save.mockImplementation(async (value: any) => value);
    await expect(service.addMemberBySimpleCode("ORG1", "U1")).resolves.toMatchObject({
      memberships: expect.any(Array),
    });

    organizationsRepository.findOne.mockResolvedValueOnce({ id: "org-2", code: "ORG2", name: "Org 2", parent: null });
    userRepository.findOne.mockResolvedValueOnce(null as any);
    await expect(service.addMemberBySimpleCode("ORG2", "MISSING")).rejects.toThrow("User with code MISSING not found");

    organizationsRepository.findOne.mockResolvedValueOnce({ id: "org-3", parent: null });
    userRepository.findOne.mockResolvedValueOnce({ id: "user-2" } as any);
    userOrganizationsRepository.findOne.mockResolvedValueOnce({ id: "existing" });
    await expect(service.bulkAddMembersByCode("org-3", ["U1", "U2"])).resolves.toMatchObject({
      success: 0,
      failed: 2,
    });

    await expect(service.validateOrganizationCodes([])).resolves.toEqual({ validCodes: [], invalidCodes: [] });
    organizationsRepository.find.mockResolvedValueOnce([{ code: "ORG1" }]);
    await expect(service.validateOrganizationCodes(["org1", "missing"]).then((result) => result)).resolves.toEqual({
      validCodes: ["ORG1"],
      invalidCodes: ["MISSING"],
    });
  });

  it("covers hierarchy and viewability helpers", async () => {
    organizationsRepository.findOne.mockResolvedValueOnce({ id: "child", parent: { id: "parent" } });
    organizationsRepository.findOne.mockResolvedValueOnce({ id: "parent", parent: null });
    await expect(service.getOrganizationLevel("child")).resolves.toBe(2);
    await expect(service.getOrganizationLevel("missing")).resolves.toBe(0);

    treeRepository.findOne.mockResolvedValueOnce(null as any);
    await expect(service.getAllDescendants("org-1")).resolves.toEqual([]);
    treeRepository.findOne.mockResolvedValueOnce({ id: "org-1" } as any);
    treeRepository.findDescendants.mockResolvedValueOnce([{ id: "org-1" }, { id: "child-1" }] as any);
    await expect(service.getAllDescendants("org-1")).resolves.toEqual([{ id: "child-1" }]);

    organizationsRepository.query.mockResolvedValueOnce([{ id: "primary" }]);
    organizationsRepository.findOne.mockResolvedValueOnce({ id: "primary", parent: null });
    await expect(service.getUserPrimaryOrganization("user-1")).resolves.toEqual({ organization: { id: "primary", parent: null } });

    organizationsRepository.query.mockResolvedValueOnce([]);
    organizationsRepository.query.mockResolvedValueOnce([{ id: "role-primary" }]);
    organizationsRepository.findOne.mockResolvedValueOnce({ id: "role-primary", parent: null });
    await expect(service.getUserPrimaryOrganization("user-2")).resolves.toEqual({ organization: { id: "role-primary", parent: null } });

    organizationsRepository.query.mockResolvedValueOnce([]);
    organizationsRepository.query.mockResolvedValueOnce([]);
    await expect(service.getUserPrimaryOrganization("user-3")).resolves.toEqual({ organization: null });

    await expect(service.getCtxhActivityViewableOrganizations("")).rejects.toThrow("Invalid user ID");
    organizationsRepository.query.mockResolvedValueOnce([{ id: "super" }]);
    organizationsRepository.find.mockResolvedValueOnce([{ id: "all" }]);
    await expect(service.getCtxhActivityViewableOrganizations("user-4")).resolves.toEqual([{ id: "all" }]);

    organizationsRepository.query.mockResolvedValueOnce([]);
    organizationsRepository.query.mockResolvedValueOnce([{ id: "view-1" }]);
    organizationsRepository.find.mockResolvedValueOnce([{ id: "view-1" }]);
    await expect(service.getCtxhActivityViewableOrganizations("user-5")).resolves.toEqual([{ id: "view-1" }]);

    organizationsRepository.query.mockResolvedValueOnce([]);
    organizationsRepository.query.mockResolvedValueOnce([]);
    await expect(service.getCtxhActivityViewableOrganizations("user-6")).resolves.toEqual([]);

    const searchQB = createQueryBuilderMock();
    searchQB.getCount.mockResolvedValueOnce(2);
    searchQB.getMany.mockResolvedValueOnce([{ id: "view-1" }, { id: "view-2" }]);
    organizationsRepository.createQueryBuilder.mockReturnValueOnce(searchQB as any);
    organizationsRepository.query.mockResolvedValueOnce([{ id: "super" }]);
    await expect(service.searchCtxhActivityViewableOrganizations("user-7", "search", 2, 15)).resolves.toMatchObject({
      data: [{ id: "view-1" }, { id: "view-2" }],
      total: 2,
      page: 2,
      limit: 15,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: true,
    });

    const noAccessQB = createQueryBuilderMock();
    organizationsRepository.createQueryBuilder.mockReturnValueOnce(noAccessQB as any);
    organizationsRepository.query.mockResolvedValueOnce([]);
    organizationsRepository.query.mockResolvedValueOnce([]);
    await expect(service.searchCtxhActivityViewableOrganizations("user-8")).resolves.toMatchObject({
      data: [],
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });
});
