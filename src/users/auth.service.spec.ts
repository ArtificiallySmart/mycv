import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { User } from './user.entity';
import { UsersService } from './users.service';

describe('AuthService', () => {
  let service: AuthService;
  let fakeUsersService: Partial<UsersService>;

  beforeEach(async () => {
    // Create a fake copy of the users service
    const users: User[] = [];
    fakeUsersService = {
      find: (email: string) => {
        const filteredUsers = users.filter((user) => user.email === email);
        return Promise.resolve(filteredUsers);
      },
      create: (email: string, password: string) => {
        const user = {
          id: Math.floor(Math.random() * 999999),
          email,
          password,
        } as User;
        users.push(user);
        return Promise.resolve(user);
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: fakeUsersService,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('can create an instance of auth service', async () => {
    expect(service).toBeDefined();
  });

  it('creates a new user with a salted and hashed password', async () => {
    const user = await service.signUp('user@example.com', 'correctpassword');
    expect(user.password).not.toEqual('correctpassword');
    const [salt, hash] = user.password.split('.');
    expect(salt).toBeDefined();
    expect(hash).toBeDefined();
  });

  it('throws a BadRequestException when user signs up with preexisting email', async () => {
    await service.signUp('user@example.com', 'correctpassword');

    await expect(
      service.signUp('user@example.com', 'randompassword1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws a NotFoundException when user signs in with nonexisting email', async () => {
    await expect(
      service.signIn('user.example.com', 'correctpassword'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws a BadRequestException if an invalid password is provided', async () => {
    await service.signUp('user@example.com', 'correctpassword');

    await expect(
      service.signIn('user@example.com', 'incorrectpassword'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns a user if a valid password is provided', async () => {
    await service.signUp('user@example.com', 'correctpassword');
    const user = await service.signIn('user@example.com', 'correctpassword');

    expect(user).toBeDefined;
  });
});
