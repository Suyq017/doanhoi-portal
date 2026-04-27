import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { UserBackgroundJobService } from "../background-job.service";

describe("UserBackgroundJobService", () => {
  let service: UserBackgroundJobService;

  beforeEach(() => {
    jest.spyOn(global, "setInterval").mockImplementation(() => 1 as any);
    service = new UserBackgroundJobService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should create jobs and place them in queue", () => {
    const id = service.createJob("session-1", "import", { batchData: [1, 2] }, 1);
    const job = service.getJob(id);

    expect(job).not.toBeNull();
    expect(job?.status).toBe("pending");
    expect(service.getQueueStatus().high).toBeGreaterThanOrEqual(1);
  });

  it("should cancel pending jobs", () => {
    const id = service.createJob("session-1", "validation", { data: [1] }, 2);
    const cancelled = service.cancelJob(id);

    expect(cancelled).toBe(true);
    expect(service.getJob(id)?.status).toBe("cancelled");
  });

  it("should return false when canceling unknown job", () => {
    expect(service.cancelJob("unknown")).toBe(false);
  });

  it("should cleanup old completed jobs", () => {
    const id = service.createJob("session-1", "cleanup", { olderThan: 24 }, 3);
    const job = service.getJob(id) as any;
    job.status = "completed";
    job.completedAt = new Date(Date.now() - 25 * 60 * 60 * 1000);

    const cleaned = service.cleanupOldJobs(24);

    expect(cleaned).toBeGreaterThanOrEqual(1);
    expect(service.getJob(id)).toBeNull();
  });

  it("should cancel running jobs and remove from running set", () => {
    const id = service.createJob("session-1", "import", { batchData: [1] }, 1);
    const job = service.getJob(id) as any;
    job.status = "running";
    (service as any).runningJobs.add(id);

    const cancelled = service.cancelJob(id);

    expect(cancelled).toBe(true);
    expect(job.status).toBe("cancelled");
    expect((service as any).runningJobs.has(id)).toBe(false);
  });

  it("should return jobs by session and pending jobs", () => {
    const id1 = service.createJob("session-a", "import", {}, 1);
    const id2 = service.createJob("session-a", "validation", {}, 2);
    service.createJob("session-b", "cleanup", {}, 3);

    expect(service.getJobsBySession("session-a").map((j) => j.id).sort()).toEqual([id1, id2].sort());
    expect(service.getPendingJobs().length).toBeGreaterThanOrEqual(3);
    expect(service.getAllJobs().length).toBeGreaterThanOrEqual(3);
  });

  it("should keep unfinished jobs when cleaning old jobs", () => {
    service.createJob("session-1", "import", {}, 1);

    const cleaned = service.cleanupOldJobs(0);

    expect(cleaned).toBe(0);
    expect(service.getAllJobs().length).toBe(1);
  });

  it("should process job success path", async () => {
    const id = service.createJob("session-1", "validation", { data: [1] }, 1);
    const job = service.getJob(id) as any;
    jest.spyOn(service as any, "processValidationJob").mockImplementation(async () => {
      job.result = { ok: true };
    });

    await (service as any).processJob(job);

    expect(job.status).toBe("completed");
    expect(job.progress).toBe(100);
    expect(job.completedAt).toBeDefined();
  });

  it("should process job failure path", async () => {
    const id = service.createJob("session-1", "import", { batchData: [1] }, 1);
    const job = service.getJob(id) as any;
    jest.spyOn(service as any, "processImportJob").mockRejectedValue(new Error("import boom"));

    await (service as any).processJob(job);

    expect(job.status).toBe("failed");
    expect(job.error).toBe("import boom");
    expect(job.completedAt).toBeDefined();
  });

  it("should cancel running jobs on module destroy", () => {
    const id1 = service.createJob("session-1", "import", {}, 1);
    const id2 = service.createJob("session-2", "validation", {}, 2);
    const job1 = service.getJob(id1) as any;
    const job2 = service.getJob(id2) as any;
    job1.status = "running";
    job2.status = "running";
    (service as any).runningJobs.add(id1);
    (service as any).runningJobs.add(id2);

    service.onModuleDestroy();

    expect(job1.status).toBe("cancelled");
    expect(job2.status).toBe("cancelled");
    expect((service as any).runningJobs.size).toBe(0);
  });

  it("should dequeue jobs by priority order", () => {
    const lowId = service.createJob("session-low", "cleanup", {}, 3);
    const normalId = service.createJob("session-normal", "validation", {}, 2);
    const highId = service.createJob("session-high", "import", {}, 1);

    const first = (service as any).getNextJob();
    const second = (service as any).getNextJob();
    const third = (service as any).getNextJob();

    expect(first.id).toBe(highId);
    expect(second.id).toBe(normalId);
    expect(third.id).toBe(lowId);
    expect((service as any).getNextJob()).toBeNull();
  });

  it("should skip processing when job is already running", async () => {
    const id = service.createJob("session-1", "import", { batchData: [1] }, 1);
    const job = service.getJob(id) as any;
    (service as any).runningJobs.add(id);
    const importSpy = jest.spyOn(service as any, "processImportJob");

    await (service as any).processJob(job);

    expect(importSpy).not.toHaveBeenCalled();
    expect(job.status).toBe("pending");
  });

  it("should process import/validation/cleanup handlers and set results", async () => {
    jest.spyOn(global, "setTimeout").mockImplementation((callback: any) => {
      callback();
      return 1 as any;
    });

    const importJob = service.getJob(service.createJob("s-import", "import", { batchData: [1, 2] }, 1)) as any;
    const validationJob = service.getJob(service.createJob("s-val", "validation", { data: [1, 2, 3] }, 2)) as any;
    const cleanupJob = service.getJob(service.createJob("s-clean", "cleanup", { olderThan: 24 }, 3)) as any;

    await (service as any).processImportJob(importJob);
    await (service as any).processValidationJob(validationJob);
    await (service as any).processCleanupJob(cleanupJob);

    expect(importJob.progress).toBe(100);
    expect(importJob.result.importedCount).toBe(2);
    expect(validationJob.progress).toBe(100);
    expect(validationJob.result.validRows).toBe(3);
    expect(cleanupJob.progress).toBe(100);
    expect(cleanupJob.result.cleanedSessions).toBe(1);
  });

  it("should report running jobs and queue status fields", () => {
    const id1 = service.createJob("session-1", "import", {}, 1);
    const id2 = service.createJob("session-2", "validation", {}, 2);
    const job1 = service.getJob(id1) as any;
    const job2 = service.getJob(id2) as any;
    job1.status = "running";
    job2.status = "running";
    (service as any).runningJobs.add(id1);
    (service as any).runningJobs.add(id2);

    const running = service.getRunningJobs();
    const queue = service.getQueueStatus();

    expect(running.map((j) => j.id).sort()).toEqual([id1, id2].sort());
    expect(queue.running).toBe(2);
    expect(queue.total).toBeGreaterThanOrEqual(2);
    expect(queue.high + queue.normal + queue.low).toBeGreaterThanOrEqual(0);
  });
});