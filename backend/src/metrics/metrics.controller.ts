import { Controller, Get, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import * as client from "prom-client";
import { MetricsGuard } from "./metrics.guard";
import { ApiExcludeController } from "@nestjs/swagger";

/**
 * Custom Prometheus metrics controller với MetricsGuard.
 * Thay thế PrometheusController mặc định của @willsoto/nestjs-prometheus.
 * Chỉ cho phép truy cập từ internal network (Docker/localhost).
 *
 * Path được set bởi PrometheusModule.register({ path: "/metrics" })
 * thông qua Reflect.defineMetadata.
 */
@ApiExcludeController()
@Controller()
@UseGuards(MetricsGuard)
export class MetricsController {
  @Get()
  async index(@Res({ passthrough: true }) response: Response): Promise<string> {
    response.header("Content-Type", client.register.contentType);
    return client.register.metrics();
  }
}
