import { describe, expect, it } from "@jest/globals";
import { DepartmentsModule } from "../departments.module";

describe("DepartmentsModule", () => {
  it("should be defined", () => {
    expect(DepartmentsModule).toBeDefined();
  });
});
