import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { query } from '../config/db';
import { User } from '../domain/zod/users.schema';
import { RegisterInput } from '../domain/zod/auth.schema';

/**
 * Repository for authentication-related database operations
 */
export class AuthRepository {
	/**
	 * Find a user by email (includes password hash for authentication)
	 */
	async findByEmailWithPassword(
		email: string
	): Promise<(User & { password_hash: string }) | null> {
		const sql = `
      SELECT 
        id, email, password_hash, first_name, last_name, 
        phone, role, created_at, updated_at
      FROM users
      WHERE email = ?
    `;

		const rows = await query<RowDataPacket[]>(sql, [email]);

		if (rows.length === 0) {
			return null;
		}

		return rows[0] as User & { password_hash: string };
	}

	/**
	 * Create a new user account
	 */
	async create(
		data: RegisterInput & { password_hash: string },
		connection?: PoolConnection
	): Promise<User> {
		const sql = `
      INSERT INTO users (
        email, password_hash, first_name, last_name, phone, role
      ) VALUES (?, ?, ?, ?, ?, 'user')
    `;

		const params = [
			data.email,
			data.password_hash,
			data.first_name,
			data.last_name,
			data.phone || null,
		];

		let insertId: number;
		if (connection) {
			const [result] = await connection.execute<ResultSetHeader>(sql, params);
			insertId = result.insertId;
		} else {
			const result = await query<ResultSetHeader>(sql, params);
			insertId = result.insertId;
		}

		// Fetch the created user
		const selectSql = `
      SELECT 
        id, email, first_name, last_name, phone, role,
        created_at, updated_at
      FROM users
      WHERE id = ?
    `;

		const rows = connection
			? ((
					await connection.execute(selectSql, [insertId])
			  )[0] as RowDataPacket[])
			: await query<RowDataPacket[]>(selectSql, [insertId]);

		return rows[0] as User;
	}

	/**
	 * Check if email already exists
	 */
	async emailExists(email: string): Promise<boolean> {
		const sql = `SELECT COUNT(*) as count FROM users WHERE email = ?`;
		const rows = await query<RowDataPacket[]>(sql, [email]);
		return rows[0].count > 0;
	}
}
