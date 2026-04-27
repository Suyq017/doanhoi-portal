import { describe, expect, it, jest } from "@jest/globals";
import { MetricsService } from "../metrics.service";

describe("MetricsService", () => {
  const createCounterMock = () => ({
    labels: jest.fn().mockReturnValue({ inc: jest.fn() }),
  });

  const createHistogramMock = () => ({
    labels: jest.fn().mockReturnValue({ observe: jest.fn() }),
    observe: jest.fn(),
  });

  const createGaugeMock = () => ({
    labels: jest.fn().mockReturnValue({ inc: jest.fn(), dec: jest.fn() }),
    set: jest.fn(),
  });

  const service = new MetricsService(
    createCounterMock() as never,
    createHistogramMock() as never,
    createHistogramMock() as never,
    createGaugeMock() as never,
    createGaugeMock() as never,
    createCounterMock() as never,
    createCounterMock() as never,
    createHistogramMock() as never,
    createHistogramMock() as never,
    createGaugeMock() as never,
  );

  it("should record HTTP request metrics", () => {
    service.recordHttpRequest("GET", "/users", 200, 0.123);
    expect((service.httpRequestsCounter.labels as jest.Mock)).toHaveBeenCalledWith("GET", "/users", "200");
    expect((service.httpRequestDuration.labels as jest.Mock)).toHaveBeenCalledWith("GET", "/users");
  });

  it("should record import session and org validation metrics", () => {
    service.recordImportSession("organization", 10, 2, 1.5);
    service.startImportSession("organization");
    service.endImportSession("organization");
    service.recordOrgValidationDuration(0.8);
    service.setOrgImportBatchSize(500);
    service.updateDbConnections(12);

    expect((service.importRowsProcessed.labels as jest.Mock)).toHaveBeenCalledWith("organization");
    expect((service.importRowsFailed.labels as jest.Mock)).toHaveBeenCalledWith("organization");
    expect((service.importDuration.labels as jest.Mock)).toHaveBeenCalledWith("organization");
    expect((service.importSessionsActive.labels as jest.Mock)).toHaveBeenCalledWith("organization");
    expect((service.orgImportValidationDuration.observe as jest.Mock)).toHaveBeenCalledWith(0.8);
    expect((service.orgImportBatchSize.set as jest.Mock)).toHaveBeenCalledWith(500);
    expect((service.dbConnectionsActive.set as jest.Mock)).toHaveBeenCalledWith(12);
  });
});