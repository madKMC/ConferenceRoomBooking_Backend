import { RowDataPacket } from 'mysql2/promise';
import { query } from '../config/db';
import { User } from '../domain/zod/users.schema';

/**
 * Repository for user-related database operations
 */
export class UsersRepository {
	/**
	 * Find a user by ID
	 */
	async findById(userId: number): Promise<User | null> {
		const sql = `
      SELECT 
        id, email, first_name, last_name, phone,
        created_at, updated_at
      FROM users
      WHERE id = ?
    `;

		const rows = await query<RowDataPacket[]>(sql, [userId]);

		if (rows.length === 0) {
			return null;
		}

		return rows[0] as User;
	}

	/**
	 * Find a user by email
	 */
	async findByEmail(email: string): Promise<User | null> {
		const sql = `
      SELECT 
        id, email, first_name, last_name, phone,
        created_at, updated_at
      FROM users
      WHERE email = ?
    `;

		const rows = await query<RowDataPacket[]>(sql, [email]);

		if (rows.length === 0) {
			return null;
		}

		return rows[0] as User;
	}
}
