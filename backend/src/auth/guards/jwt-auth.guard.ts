import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        
        // Simple mock authentication for testing
        request.user = {
            id: 'b1982741-6d51-4c5d-9723-4192eb6d2512',
            name: 'Nguyễn Phương Duy',
            role: 'user'
        };
        
        return true;
    }
}
