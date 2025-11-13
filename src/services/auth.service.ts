import bcrypt from 'bcryptjs';
import { AuthRepository } from '../repositories/auth.repo';
import { UsersRepository } from '../repositories/users.repo';
import {
	RegisterInput,
	LoginInput,
	LoginResponse,
	TokenPayload,
} from '../domain/zod/auth.schema';
import { User } from '../domain/zod/users.schema';
import { ConflictError, HttpError, NotFoundError } from '../utils/httpErrors';
import { signToken } from '../utils/jwt';

/**
 * Service for authentication-related business logic
 */
export class AuthService {
	private authRepo: AuthRepository;
	private usersRepo: UsersRepository;

	constructor() {
		this.authRepo = new AuthRepository();
		this.usersRepo = new UsersRepository();
	}

	/**
	 * Register a new user
	 */
	async register(data: RegisterInput): Promise<LoginResponse> {
		// Check if email already exists
		const exists = await this.authRepo.emailExists(data.email);
		if (exists) {
			throw new ConflictError('Email already registered');
		}

		// Hash password
		const saltRounds = 10;
		const password_hash = await bcrypt.hash(data.password, saltRounds);

		// Create user
		const user = await this.authRepo.create({
			...data,
			password_hash,
		});

		// Generate token
		const token = this.generateToken(user);

		return {
			token,
			user: {
				id: user.id,
				email: user.email,
				first_name: user.first_name,
				last_name: user.last_name,
				role: user.role,
			},
		};
	}

	/**
	 * Authenticate user and return token
	 */
	async login(data: LoginInput): Promise<LoginResponse> {
		// Find user by email
		const user = await this.authRepo.findByEmailWithPassword(data.email);
		if (!user) {
			throw new HttpError(
				401,
				'INVALID_CREDENTIALS',
				'Invalid email or password'
			);
		}

		// Verify password
		const isValidPassword = await bcrypt.compare(
			data.password,
			user.password_hash
		);
		if (!isValidPassword) {
			throw new HttpError(
				401,
				'INVALID_CREDENTIALS',
				'Invalid email or password'
			);
		}

		// Generate token
		const token = this.generateToken(user);

		return {
			token,
			user: {
				id: user.id,
				email: user.email,
				first_name: user.first_name,
				last_name: user.last_name,
				role: user.role,
			},
		};
	}

	/**
	 * Get current user by ID
	 */
	async getCurrentUser(userId: number): Promise<User> {
		const user = await this.usersRepo.findById(userId);
		if (!user) {
			throw new NotFoundError('User not found');
		}
		return user;
	}

	/**
	 * Generate JWT token for user
	 */
	private generateToken(user: User): string {
		const payload: TokenPayload = {
			userId: user.id,
			email: user.email,
			role: user.role,
		};

		return signToken(payload);
	}
}
