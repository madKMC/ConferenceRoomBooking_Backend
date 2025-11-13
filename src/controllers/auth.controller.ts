import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

/**
 * Controller for authentication endpoints
 */
export class AuthController {
	private authService: AuthService;

	constructor() {
		this.authService = new AuthService();
	}

	/**
	 * POST /auth/register
	 * Register a new user account
	 */
	register = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const result = await this.authService.register(req.body);

			res.status(201).json({
				success: true,
				data: result,
			});
		} catch (error) {
			next(error);
		}
	};

	/**
	 * POST /auth/login
	 * Authenticate user and return JWT token
	 */
	login = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const result = await this.authService.login(req.body);

			res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			next(error);
		}
	};

	/**
	 * GET /auth/me
	 * Get current authenticated user
	 */
	getCurrentUser = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			if (!req.user) {
				res.status(401).json({
					success: false,
					code: 'UNAUTHORIZED',
					message: 'Authentication required',
				});
				return;
			}

			const user = await this.authService.getCurrentUser(req.user.userId);

			res.status(200).json({
				success: true,
				data: user,
			});
		} catch (error) {
			next(error);
		}
	};
}
