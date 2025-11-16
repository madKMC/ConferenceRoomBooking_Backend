/**
 * Unit tests for Auth Service
 * Tests: register, login, getCurrentUser
 */
import { AuthService } from '../../../src/services/auth.service';
import { AuthRepository } from '../../../src/repositories/auth.repo';
import { UsersRepository } from '../../../src/repositories/users.repo';
import bcrypt from 'bcryptjs';

// Mock repositories
jest.mock('../../../src/repositories/auth.repo');
jest.mock('../../../src/repositories/users.repo');
jest.mock('bcryptjs');

describe('Auth Service Unit Tests', () => {
	let authService: AuthService;
	let mockAuthRepo: jest.Mocked<AuthRepository>;
	let mockUsersRepo: jest.Mocked<UsersRepository>;

	beforeEach(() => {
		authService = new AuthService();
		mockAuthRepo = (authService as any).authRepo;
		mockUsersRepo = (authService as any).usersRepo;
		jest.clearAllMocks();
	});

	describe('register', () => {
		it('should successfully register a new user', async () => {
			const registerData = {
				email: 'newuser@test.com',
				password: 'SecurePass123!',
				first_name: 'New',
				last_name: 'User',
			};

			const mockUser = {
				id: 1,
				email: 'newuser@test.com',
				first_name: 'New',
				last_name: 'User',
				role: 'user' as const,
			};

			mockAuthRepo.emailExists = jest.fn().mockResolvedValue(false);
			(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
			mockAuthRepo.create = jest.fn().mockResolvedValue(mockUser);

			const result = await authService.register(registerData);

			expect(mockAuthRepo.emailExists).toHaveBeenCalledWith(registerData.email);
			expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 10);
			expect(result).toHaveProperty('token');
			expect(result.user.email).toBe(registerData.email);
		});

		it('should throw error if email already exists', async () => {
			const registerData = {
				email: 'existing@test.com',
				password: 'SecurePass123!',
				first_name: 'Test',
				last_name: 'User',
			};

			mockAuthRepo.emailExists = jest.fn().mockResolvedValue(true);

			await expect(authService.register(registerData)).rejects.toThrow(
				'Email already registered'
			);
		});

		it('should hash password with 10 rounds', async () => {
			const registerData = {
				email: 'newuser@test.com',
				password: 'SecurePass123!',
				first_name: 'New',
				last_name: 'User',
			};

			mockAuthRepo.emailExists = jest.fn().mockResolvedValue(false);
			(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
			mockAuthRepo.create = jest.fn().mockResolvedValue({
				id: 1,
				email: 'newuser@test.com',
				first_name: 'New',
				last_name: 'User',
				role: 'user' as const,
			});

			await authService.register(registerData);

			expect(bcrypt.hash).toHaveBeenCalledWith('SecurePass123!', 10);
		});
	});

	describe('login', () => {
		it('should successfully login with valid credentials', async () => {
			const loginData = {
				email: 'user@test.com',
				password: 'password123',
			};

			const mockUser = {
				id: 1,
				email: 'user@test.com',
				password_hash: 'hashed-password',
				first_name: 'Test',
				last_name: 'User',
				role: 'user' as const,
			};

			mockAuthRepo.findByEmailWithPassword = jest.fn().mockResolvedValue(mockUser);
			(bcrypt.compare as jest.Mock).mockResolvedValue(true);

			const result = await authService.login(loginData);

			expect(mockAuthRepo.findByEmailWithPassword).toHaveBeenCalledWith(
				loginData.email
			);
			expect(bcrypt.compare).toHaveBeenCalledWith(
				loginData.password,
				mockUser.password_hash
			);
			expect(result).toHaveProperty('token');
			expect(result.user.email).toBe(loginData.email);
		});

		it('should throw error for non-existent user', async () => {
			const loginData = {
				email: 'nonexistent@test.com',
				password: 'password123',
			};

			mockAuthRepo.findByEmailWithPassword = jest.fn().mockResolvedValue(null);

			await expect(authService.login(loginData)).rejects.toThrow(
				'Invalid email or password'
			);
		});

		it('should throw error for wrong password', async () => {
			const loginData = {
				email: 'user@test.com',
				password: 'wrongpassword',
			};

			const mockUser = {
				id: 1,
				email: 'user@test.com',
				password_hash: 'hashed-password',
				first_name: 'Test',
				last_name: 'User',
				role: 'user' as const,
			};

			mockAuthRepo.findByEmailWithPassword = jest.fn().mockResolvedValue(mockUser);
			(bcrypt.compare as jest.Mock).mockResolvedValue(false);

			await expect(authService.login(loginData)).rejects.toThrow(
				'Invalid email or password'
			);
		});
	});

	describe('getCurrentUser', () => {
		it('should return user by ID', async () => {
			const mockUser = {
				id: 1,
				email: 'user@test.com',
				first_name: 'Test',
				last_name: 'User',
				role: 'user' as const,
			};

			mockUsersRepo.findById = jest.fn().mockResolvedValue(mockUser);

			const result = await authService.getCurrentUser(1);

			expect(mockUsersRepo.findById).toHaveBeenCalledWith(1);
			expect(result).toEqual(mockUser);
		});

		it('should throw error if user not found', async () => {
			mockUsersRepo.findById = jest.fn().mockResolvedValue(null);

			await expect(authService.getCurrentUser(99999)).rejects.toThrow(
				'User not found'
			);
		});
	});
});
