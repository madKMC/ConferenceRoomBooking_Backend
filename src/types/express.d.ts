import { Request } from 'express';
import { TokenPayload } from '../domain/zod/auth.schema';

declare global {
	namespace Express {
		interface Request {
			correlationId: string;
			user?: TokenPayload;
		}
	}
}
