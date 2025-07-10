import { User } from '../../entities/user.entity';

export class AuthResponseDto {
  user: Omit<User, 'password' | 'refreshToken'>;
  accessToken: string;
  refreshToken: string;
}
