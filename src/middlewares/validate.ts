import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../utils/httpErrors';

/**
 * Middleware factory for validating requests with Zod schemas
 * Validates body, query, and params and applies transformations
 */
export function validate(schema: AnyZodObject) {
	return async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const validated = await schema.parseAsync({
				body: req.body,
				query: req.query,
				params: req.params,
			});

			// Apply the validated (and transformed) data back to the request
			req.body = validated.body;
			req.query = validated.query;
			req.params = validated.params;

			next();
		} catch (error) {
			if (error instanceof ZodError) {
				const details = error.errors.map((err) => ({
					path: err.path.join('.'),
					message: err.message,
					code: err.code,
				}));

				next(new ValidationError('Validation failed', details));
			} else {
				next(error);
			}
		}
	};
}
