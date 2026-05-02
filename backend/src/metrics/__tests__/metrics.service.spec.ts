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

  const createService = () => {
    const httpRequestsCounter = createCounterMock();
    const httpRequestDuration = createHistogramMock();
    const dbQueryDuration = createHistogramMock();
    const dbConnectionsActive = createGaugeMock();
    const importSessionsActive = createGaugeMock();
    const importRowsProcessed = createCounterMock();
    const importRowsFailed = createCounterMock();
    const importDuration = createHistogramMock();
    const orgImportValidationDuration = createHistogramMock();
    const orgImportBatchSize = createGaugeMock();

    return {
      service: new MetricsService(
        httpRequestsCounter as never,
        httpRequestDuration as never,
        dbQueryDuration as never,
        dbConnectionsActive as never,
        importSessionsActive as never,
        importRowsProcessed as never,
        importRowsFailed as never,
        importDuration as never,
        orgImportValidationDuration as never,
        orgImportBatchSize as never,
      ),
      httpRequestsCounter,
      httpRequestDuration,
      dbQueryDuration,
      dbConnectionsActive,
      importSessionsActive,
      importRowsProcessed,
      importRowsFailed,
      importDuration,
      orgImportValidationDuration,
      orgImportBatchSize,
    };
  };

  const originalConsoleError = console.error;

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("should record HTTP request metrics", () => {
    const { service, httpRequestsCounter, httpRequestDuration } = createService();

    service.recordHttpRequest("GET", "/users", 200, 0.123);

    expect(httpRequestsCounter.labels).toHaveBeenCalledWith("GET", "/users", "200");
    expect(httpRequestDuration.labels).toHaveBeenCalledWith("GET", "/users");
    expect(((httpRequestsCounter.labels as jest.Mock).mock.results[0].value as any).inc).toHaveBeenCalled();
    expect(((httpRequestDuration.labels as jest.Mock).mock.results[0].value as any).observe).toHaveBeenCalledWith(0.123);
  });

  it("should swallow HTTP metric recording errors and log them", () => {
    const { service, httpRequestsCounter } = createService();
    const error = new Error("boom");
    const consoleErrorSpy = jest.fn();

    console.error = consoleErrorSpy;
    (httpRequestsCounter.labels as jest.Mock).mockImplementation(() => {
      throw error;
    });

    expect(() => service.recordHttpRequest("POST", "/imports", 500, 1.2)).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalledWith("❌ Error recording HTTP metrics:", "boom");
    expect(consoleErrorSpy).toHaveBeenCalledWith("   Method:", "POST", "Path:", "/imports", "Status:", 500);
  });

  it("should record database and import metrics", () => {
    const {
      service,
      dbQueryDuration,
      importRowsProcessed,
      importRowsFailed,
      importDuration,
      importSessionsActive,
      orgImportValidationDuration,
      orgImportBatchSize,
      dbConnectionsActive,
    } = createService();

    service.recordDbQuery("SELECT", 0.42);
    service.recordImportSession("organization", 10, 2, 1.5);
    service.startImportSession("organization");
    service.endImportSession("organization");
    service.recordOrgValidationDuration(0.8);
    service.setOrgImportBatchSize(500);
    service.updateDbConnections(12);

    expect(dbQueryDuration.labels).toHaveBeenCalledWith("SELECT");
    expect(((dbQueryDuration.labels as jest.Mock).mock.results[0].value as any).observe).toHaveBeenCalledWith(0.42);
    expect(importRowsProcessed.labels).toHaveBeenCalledWith("organization");
    expect(importRowsFailed.labels).toHaveBeenCalledWith("organization");
    expect(importDuration.labels).toHaveBeenCalledWith("organization");
    expect(((importRowsProcessed.labels as jest.Mock).mock.results[0].value as any).inc).toHaveBeenCalledWith(10);
    expect(((importRowsFailed.labels as jest.Mock).mock.results[0].value as any).inc).toHaveBeenCalledWith(2);
    expect(((importDuration.labels as jest.Mock).mock.results[0].value as any).observe).toHaveBeenCalledWith(1.5);
    expect(importSessionsActive.labels).toHaveBeenCalledWith("organization");
    expect(((importSessionsActive.labels as jest.Mock).mock.results[0].value as any).inc).toHaveBeenCalled();
    expect(((importSessionsActive.labels as jest.Mock).mock.results[1].value as any).dec).toHaveBeenCalled();
    expect(orgImportValidationDuration.observe).toHaveBeenCalledWith(0.8);
    expect(orgImportBatchSize.set).toHaveBeenCalledWith(500);
    expect(dbConnectionsActive.set).toHaveBeenCalledWith(12);
  });
});