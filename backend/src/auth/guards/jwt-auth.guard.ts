import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext) {
    console.log("🔒 JwtAuthGuard: Starting JWT authentication...");
    // Remove mock and let the actual JWT strategy handle authentication
    return super.canActivate(context);
  }
}
