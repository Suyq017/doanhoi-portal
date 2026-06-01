import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : undefined;

    const message = this.extractMessage(exceptionResponse, exception);
    const error = isHttpException
      ? exception.name
      : "InternalServerError";

    response.status(status).json({
      statusCode: status,
      message,
      error,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      requestId:
        request.headers["x-request-id"] || request.id || undefined,
      details:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? this.extractDetails(exception)
          : undefined,
    });
  }

  private extractMessage(
    exceptionResponse: string | Record<string, any> | undefined,
    exception: unknown,
  ): string {
    if (typeof exceptionResponse === "string") {
      return exceptionResponse;
    }

    if (exceptionResponse && typeof exceptionResponse === "object") {
      if (typeof exceptionResponse.message === "string") {
        return exceptionResponse.message;
      }

      if (Array.isArray(exceptionResponse.message)) {
        return exceptionResponse.message.join(", ");
      }
    }

    if (exception instanceof Error && exception.message) {
      return exception.message;
    }

    return "Internal server error";
  }

  private extractDetails(exception: unknown) {
    if (exception instanceof Error) {
      return {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      };
    }

    return exception;
  }
}