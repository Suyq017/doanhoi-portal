import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { User, UserType, MembershipStatus } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user with email or code already exists
    const existingUser = await this.usersRepository.findOne({
      where: [
        { email: createUserDto.email },
        { code: createUserDto.code }
      ]
    });

    if (existingUser) {
      throw new BadRequestException('User with this email or code already exists');
    }

    // Hash password if provided
    const userData = { ...createUserDto };
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async findAll(query: QueryUserDto): Promise<{ users: User[], total: number }> {
    const { page = 1, limit = 10, search, userType, membershipStatus } = query;

    const queryBuilder = this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.managementDepartment', 'managementDepartment')
      .leftJoinAndSelect('user.trainingDepartment', 'trainingDepartment')
      .leftJoinAndSelect('user.class', 'class');

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(CONCAT(user.familyName, \' \', user.givenName) ILIKE :search OR user.email ILIKE :search OR user.code ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // UserType filter
    if (userType) {
      queryBuilder.andWhere('user.userType = :userType', { userType });
    }

    // MembershipStatus filter
    if (membershipStatus) {
      queryBuilder.andWhere('user.membershipStatus = :membershipStatus', { membershipStatus });
    }

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    return { users, total };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['managementDepartment', 'trainingDepartment', 'class', 'organizations', 'organizations.organization']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['organizations', 'organizations.organization']
    });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { googleId },
      relations: ['organizations', 'organizations.organization']
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Hash password if provided
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
  async removeMultiple(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('No user IDs provided');
    }

    // Validate that all users exist
    const users = await this.usersRepository.find({
      where: { id: In(ids) }
    });

    if (users.length !== ids.length) {
      const foundIds = users.map(user => user.id);
      const notFoundIds = ids.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Users not found: ${notFoundIds.join(', ')}`);
    }

    // Remove all users
    await this.usersRepository.remove(users);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    if (!user.password) return false;
    return bcrypt.compare(password, user.password);
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    await this.usersRepository.update(userId, { 
      refreshToken,
      lastLogin: refreshToken ? new Date() : undefined
    });
  }

  async updateGoogleId(userId: string, googleId: string): Promise<void> {
    await this.usersRepository.update(userId, { 
      googleId,
      authProvider: 'google' as any
    });
  }

  async getUsersWithDefaultPassword(): Promise<{
    users: { id: string; familyName: string; givenName: string; email: string; hasEmailBasedPassword: boolean; emailBasedPassword?: string }[];
    totalUsersWithEmailBasedPassword: number;
  }> {
    
    // Get all users with passwords
    const users = await this.usersRepository.find({
      select: ['id', 'familyName', 'givenName', 'email', 'password'],
      where: { password: Not(IsNull()) }
    });
    
    const usersWithStatus = [];
    
    for (const user of users) {
      try {
        // Generate expected email-based password
        const emailBasedPassword = this.generatePasswordFromEmail(user.email);
        
        // Check if user has email-based password
        const hasEmailBasedPassword = await bcrypt.compare(emailBasedPassword, user.password);
        
        usersWithStatus.push({
          id: user.id,
          familyName: user.familyName,
          givenName: user.givenName,
          email: user.email,
          hasEmailBasedPassword,
          emailBasedPassword: hasEmailBasedPassword ? emailBasedPassword : undefined
        });
      } catch (error) {
        // If password comparison fails, assume it's not email-based password
        usersWithStatus.push({
          id: user.id,
          familyName: user.familyName,
          givenName: user.givenName,
          email: user.email,
          hasEmailBasedPassword: false
        });
      }
    }
    
    const totalUsersWithEmailBasedPassword = usersWithStatus.filter(u => u.hasEmailBasedPassword).length;
    
    return {
      users: usersWithStatus,
      totalUsersWithEmailBasedPassword
    };
  }

  private generatePasswordFromEmail(email: string): string {
    // Generate password from email: take username part before @
    // Example: "nguyen.van.a@example.com" → "nguyenvana"
    // Example: "test@example.com" → "test"
    const username = email.split('@')[0];

    const password = username.replace(/\./g, '');

    return password;
  }
}
