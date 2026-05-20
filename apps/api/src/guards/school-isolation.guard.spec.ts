import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { SchoolIsolationGuard } from "./school-isolation.guard";

describe("SchoolIsolationGuard", () => {
  let guard: SchoolIsolationGuard;

  beforeEach(() => {
    const mockAuditRepo = { save: jest.fn().mockResolvedValue({}) };
    const mockReflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    guard = new SchoolIsolationGuard(mockAuditRepo as any, mockReflector as any);
  });

  it("allows request when no schoolId in params", async () => {
    const ctx = createMockContext({
      user: { role: "teacher", schoolId: "school-A", sub: "user-1" },
      params: {},
      query: {},
      body: {},
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it("allows request when schoolId matches user school", async () => {
    const ctx = createMockContext({
      user: { role: "teacher", schoolId: "school-A", sub: "user-1" },
      params: { schoolId: "school-A" },
      query: {},
      body: {},
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it("blocks request when schoolId does not match", async () => {
    const ctx = createMockContext({
      user: { role: "teacher", schoolId: "school-A", sub: "user-1" },
      params: { schoolId: "school-B" },
      query: {},
      body: {},
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it("allows global admin to access any school", async () => {
    const ctx = createMockContext({
      user: { role: "admin", schoolId: null, sub: "admin-1" },
      params: { schoolId: "school-B" },
      query: {},
      body: {},
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it("allows request with no user (unauthenticated)", async () => {
    const ctx = createMockContext({
      user: undefined,
      params: { schoolId: "school-B" },
      query: {},
      body: {},
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it("allows request on public /auth/ path", async () => {
    const ctx = createMockContext({
      user: { role: "teacher", schoolId: "school-A", sub: "user-1" },
      params: { schoolId: "school-B" },
      query: {},
      body: {},
      url: "/auth/login",
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it("skips isolation when @SkipIsolation() decorator is present", async () => {
    const mockAuditRepo = { save: jest.fn().mockResolvedValue({}) };
    const mockReflector = { getAllAndOverride: jest.fn().mockReturnValue(true) };
    const skipGuard = new SchoolIsolationGuard(mockAuditRepo as any, mockReflector as any);

    const ctx = createMockContext({
      user: { role: "teacher", schoolId: "school-A", sub: "user-1" },
      params: { schoolId: "school-B" },
      query: {},
      body: {},
    });
    expect(await skipGuard.canActivate(ctx)).toBe(true);
  });

  it("allows schoolId match in query param", async () => {
    const ctx = createMockContext({
      user: { role: "teacher", schoolId: "school-A", sub: "user-1" },
      params: {},
      query: { schoolId: "school-A" },
      body: {},
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it("blocks schoolId mismatch in request body", async () => {
    const ctx = createMockContext({
      user: { role: "teacher", schoolId: "school-A", sub: "user-1" },
      params: {},
      query: {},
      body: { schoolId: "school-B" },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});

function createMockContext(data: {
  user: { role: string; schoolId: string | null; sub: string } | undefined;
  params: Record<string, string>;
  query: Record<string, string>;
  body: Record<string, string>;
  url?: string;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: data.user,
        params: data.params,
        query: data.query,
        body: data.body,
        ip: "127.0.0.1",
        url: data.url ?? "/api/test",
        method: "GET",
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}
