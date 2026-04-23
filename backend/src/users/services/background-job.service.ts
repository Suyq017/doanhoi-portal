import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter } from "events";

export interface BackgroundJob {
  id: string;
  sessionId: string;
  type: "import" | "validation" | "cleanup";
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  priority: number; // 1 = high, 2 = normal, 3 = low
  progress: number; // 0-100
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  data: any;
}

@Injectable()
export class UserBackgroundJobService extends EventEmitter {
  private readonly logger = new Logger(UserBackgroundJobService.name);
  private readonly jobs = new Map<string, BackgroundJob>();
  private readonly queues = {
    high: [] as BackgroundJob[],
    normal: [] as BackgroundJob[],
    low: [] as BackgroundJob[],
  };
  private isProcessing = false;
  private maxConcurrentJobs = 3;
  private runningJobs = new Set<string>();

  constructor() {
    super();
    this.startJobProcessor();
  }

  createJob(
    sessionId: string,
    type: BackgroundJob["type"],
    data: any,
    priority: number = 2,
  ): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: BackgroundJob = {
      id: jobId,
      sessionId,
      type,
      status: "pending",
      priority,
      progress: 0,
      createdAt: new Date(),
      data,
    };

    this.jobs.set(jobId, job);
    this.addToQueue(job);

    this.logger.log(`Created ${type} job ${jobId} for session ${sessionId}`);
    this.emit("jobCreated", job);

    return jobId;
  }

  private addToQueue(job: BackgroundJob): void {
    switch (job.priority) {
      case 1:
        this.queues.high.push(job);
        break;
      case 2:
        this.queues.normal.push(job);
        break;
      default:
        this.queues.low.push(job);
    }

    // Sort by creation time
    Object.values(this.queues).forEach((queue) => {
      queue.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    });
  }

  private startJobProcessor(): void {
    setInterval(async () => {
      if (this.runningJobs.size < this.maxConcurrentJobs) {
        const nextJob = this.getNextJob();
        if (nextJob) {
          this.processJob(nextJob);
        }
      }
    }, 1000); // Check every second
  }

  private getNextJob(): BackgroundJob | null {
    // Process high priority first, then normal, then low
    for (const queue of [
      this.queues.high,
      this.queues.normal,
      this.queues.low,
    ]) {
      const job = queue.shift();
      if (job) {
        return job;
      }
    }
    return null;
  }

  private async processJob(job: BackgroundJob): Promise<void> {
    if (this.runningJobs.has(job.id)) {
      return; // Already running
    }

    this.runningJobs.add(job.id);
    job.status = "running";
    job.startedAt = new Date();

    this.logger.log(`Starting ${job.type} job ${job.id}`);
    this.emit("jobStarted", job);

    try {
      switch (job.type) {
        case "import":
          await this.processImportJob(job);
          break;
        case "validation":
          await this.processValidationJob(job);
          break;
        case "cleanup":
          await this.processCleanupJob(job);
          break;
      }

      job.status = "completed";
      job.progress = 100;
      job.completedAt = new Date();

      this.logger.log(`Completed ${job.type} job ${job.id}`);
      this.emit("jobCompleted", job);
    } catch (error) {
      job.status = "failed";
      job.error = error.message;
      job.completedAt = new Date();

      this.logger.error(`Failed ${job.type} job ${job.id}: ${error.message}`);
      this.emit("jobFailed", job);
    } finally {
      this.runningJobs.delete(job.id);
    }
  }

  private async processImportJob(job: BackgroundJob): Promise<void> {
    // This would integrate with the ImportService
    const {
      sessionId: _sessionId,
      batchData: _batchData,
      options: _options,
    } = job.data;

    // Simulate processing with progress updates
    for (let i = 0; i <= 100; i += 10) {
      job.progress = i;
      this.emit("jobProgress", job);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate work
    }

    job.result = {
      importedCount: _batchData?.length || 0,
      message: "Background import completed successfully",
    };
  }

  private async processValidationJob(job: BackgroundJob): Promise<void> {
    const { sessionId: _sessionId, data: _data } = job.data;

    // Simulate validation processing
    for (let i = 0; i <= 100; i += 20) {
      job.progress = i;
      this.emit("jobProgress", job);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    job.result = {
      validRows: _data?.length || 0,
      invalidRows: 0,
      message: "Background validation completed successfully",
    };
  }

  private async processCleanupJob(job: BackgroundJob): Promise<void> {
    const { sessionId: _sessionId, olderThan: _olderThan } = job.data;

    // Simulate cleanup
    job.progress = 50;
    this.emit("jobProgress", job);
    await new Promise((resolve) => setTimeout(resolve, 100));

    job.progress = 100;
    job.result = {
      cleanedSessions: 1,
      message: "Cleanup completed successfully",
    };
  }

  getJob(jobId: string): BackgroundJob | null {
    return this.jobs.get(jobId) || null;
  }

  getJobsBySession(sessionId: string): BackgroundJob[] {
    return Array.from(this.jobs.values()).filter(
      (job) => job.sessionId === sessionId,
    );
  }

  getAllJobs(): BackgroundJob[] {
    return Array.from(this.jobs.values());
  }

  getRunningJobs(): BackgroundJob[] {
    return Array.from(this.jobs.values()).filter(
      (job) => job.status === "running",
    );
  }

  getPendingJobs(): BackgroundJob[] {
    return Object.values(this.queues).flat();
  }

  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === "pending") {
      // Remove from queue
      Object.values(this.queues).forEach((queue) => {
        const index = queue.findIndex((j) => j.id === jobId);
        if (index !== -1) {
          queue.splice(index, 1);
        }
      });
    }

    if (job.status === "running") {
      this.runningJobs.delete(jobId);
    }

    job.status = "cancelled";
    job.completedAt = new Date();

    this.logger.log(`Cancelled job ${jobId}`);
    this.emit("jobCancelled", job);

    return true;
  }

  getQueueStatus(): {
    high: number;
    normal: number;
    low: number;
    running: number;
    total: number;
  } {
    return {
      high: this.queues.high.length,
      normal: this.queues.normal.length,
      low: this.queues.low.length,
      running: this.runningJobs.size,
      total: this.jobs.size,
    };
  }

  cleanupOldJobs(olderThanHours: number = 24): number {
    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
    let cleanedCount = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt && job.completedAt.getTime() < cutoffTime) {
        this.jobs.delete(jobId);
        cleanedCount++;
      }
    }

    this.logger.log(`Cleaned up ${cleanedCount} old jobs`);
    return cleanedCount;
  }

  onModuleDestroy(): void {
    // Cancel all running jobs
    for (const jobId of this.runningJobs) {
      this.cancelJob(jobId);
    }
  }
}
