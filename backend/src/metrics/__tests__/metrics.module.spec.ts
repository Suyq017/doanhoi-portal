import { describe, expect, it } from "@jest/globals";
import { MetricsModule } from "../metrics.module";

describe("MetricsModule", () => {
  it("should be defined", () => {
    expect(MetricsModule).toBeDefined();
  });
});
