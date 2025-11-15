import { RowDataPacket, PoolConnection } from 'mysql2/promise';
import { query, getPool } from '../config/db';
import { User } from '../domain/zod/users.schema';

/**
 * Repository for user-related database operations
 */
export class UsersRepository {
	/**
	 * Find a user by ID
	 */
	async findById(
		userId: number,
		connection?: PoolConnection
	): Promise<User | null> {
		const sql = `
      SELECT 
        id, email, first_name, last_name, phone,
        created_at, updated_at
      FROM users
      WHERE id = ?
    `;

		const rows = connection
			? ((await connection.execute(sql, [userId]))[0] as RowDataPacket[])
			: await query<RowDataPacket[]>(sql, [userId]);

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

	/**
	 * List all users (for invitation selection)
	 * Excludes password hash for security
	 */
	async list(
		options: {
			search?: string;
			limit?: number;
			offset?: number;
		} = {}
	): Promise<Array<Omit<User, 'password_hash'>>> {
		const { search, limit = 50, offset = 0 } = options;

		let sql =
			'SELECT id, email, first_name, last_name, phone, role, created_at, updated_at FROM users';
		const params: (string | number)[] = [];

		if (search && search.trim()) {
			sql += ' WHERE email LIKE ? OR first_name LIKE ? OR last_name LIKE ?';
			const searchPattern = `%${search.trim()}%`;
			params.push(searchPattern, searchPattern, searchPattern);
		}

		sql += ' ORDER BY first_name, last_name';

		if (limit) {
			sql += ' LIMIT ?';
			params.push(limit);

			if (offset) {
				sql += ' OFFSET ?';
				params.push(offset);
			}
		}

		const [rows] = await getPool().query<RowDataPacket[]>(sql, params);
		return rows as Array<Omit<User, 'password_hash'>>;
	}
}
