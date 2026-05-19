import { describe, expect, it } from "@jest/globals";
import { AwsS3ConfigModule } from "../aws-s3-config.module";

describe("AwsS3ConfigModule", () => {
  it("should be defined", () => {
    expect(AwsS3ConfigModule).toBeDefined();
  });
});
