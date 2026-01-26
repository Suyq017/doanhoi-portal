import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class CleanEmptyStringsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.body && typeof req.body === "object") {
      this.cleanEmptyStrings(req.body);
    }
    next();
  }

  private cleanEmptyStrings(obj: any): void {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        if (typeof value === "string" && value.trim() === "") {
          // Convert empty strings to undefined so they are treated as not provided
          obj[key] = undefined;
        } else if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          // Recursively clean nested objects
          this.cleanEmptyStrings(value);
        }
      }
    }
  }
}
