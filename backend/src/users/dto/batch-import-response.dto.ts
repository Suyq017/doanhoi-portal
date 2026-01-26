import { ApiProperty } from "@nestjs/swagger";

export class BatchResultDto {
  @ApiProperty({
    description: "Number of records processed in this batch",
    example: 200,
  })
  processed: number;

  @ApiProperty({
    description: "Number of successfully imported records",
    example: 195,
  })
  successful: number;

  @ApiProperty({
    description: "Number of failed records",
    example: 5,
  })
  failed: number;

  @ApiProperty({
    description: "Array of error messages for failed records",
    example: ["Row 10: Email already exists", "Row 25: Invalid phone format"],
    type: [String],
  })
  errors: string[];
}

export class SessionSummaryDto {
  @ApiProperty({
    description: "Total records processed across all batches",
    example: 1000,
  })
  totalProcessed: number;

  @ApiProperty({
    description: "Total successful records across all batches",
    example: 980,
  })
  totalSuccessful: number;

  @ApiProperty({
    description: "Total failed records across all batches",
    example: 20,
  })
  totalFailed: number;

  @ApiProperty({
    description: "Whether all batches have been processed",
    example: false,
  })
  isComplete: boolean;

  @ApiProperty({
    description: "Session start time",
    example: "2023-10-11T10:00:00Z",
  })
  startTime?: Date;

  @ApiProperty({
    description: "Session end time (if complete)",
    example: "2023-10-11T10:05:00Z",
  })
  endTime?: Date;

  @ApiProperty({
    description: "Total processing duration in milliseconds",
    example: 300000,
  })
  duration?: number;
}

export class BatchImportResponseDto {
  @ApiProperty({
    description: "Whether the batch import was successful",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: "Batch processing results",
    type: BatchResultDto,
  })
  batchResult: BatchResultDto;

  @ApiProperty({
    description: "Session summary across all batches",
    type: SessionSummaryDto,
  })
  sessionSummary: SessionSummaryDto;

  @ApiProperty({
    description: "Success message",
    example: "Batch 1/5 processed successfully",
  })
  message?: string;
}

export class ImportErrorDto {
  @ApiProperty({
    description: "Row number where error occurred",
    example: 10,
  })
  row: number;

  @ApiProperty({
    description: "Field name that caused the error",
    example: "email",
  })
  field: string;

  @ApiProperty({
    description: "Value that caused the error",
    example: "invalid-email",
  })
  value: any;

  @ApiProperty({
    description: "Error message",
    example: "Invalid email format",
  })
  message: string;

  @ApiProperty({
    description: "Error type",
    example: "validation",
    enum: ["validation", "business", "system"],
  })
  type: "validation" | "business" | "system";
}
