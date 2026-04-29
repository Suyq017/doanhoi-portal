import { describe, expect, it } from "@jest/globals";
import { AuthModule } from "../auth.module";

describe("AuthModule", () => {
  it("should be defined", () => {
    expect(AuthModule).toBeDefined();
  });
});
