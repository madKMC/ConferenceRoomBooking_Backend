import mysql from 'mysql2/promise';
import { env } from './env';
import { logger } from '../utils/logger';

let pool: mysql.Pool | null = null;

/**
 * Get or create MySQL connection pool
 * Uses InnoDB with REPEATABLE READ isolation level
 */
export function getPool(): mysql.Pool {
	if (!pool) {
		pool = mysql.createPool({
			host: env.db.host,
			port: env.db.port,
			user: env.db.user,
			password: env.db.password,
			database: env.db.database,
			connectionLimit: env.db.connectionLimit,
			waitForConnections: true,
			queueLimit: 0,
			timezone: '+02:00', // Africa/Johannesburg
			// InnoDB uses REPEATABLE READ by default in MySQL
		});

		logger.info('MySQL connection pool created', {
			host: env.db.host,
			database: env.db.database,
		});
	}

	return pool;
}

/**
 * Execute a function within a transaction
 * Automatically handles BEGIN, COMMIT, and ROLLBACK
 *
 * Transaction isolation: REPEATABLE READ (InnoDB default)
 * - Next-key locks prevent phantom reads on indexed range scans
 * - SELECT ... FOR UPDATE acquires exclusive locks on matching rows
 * - Locks held until COMMIT or ROLLBACK
 */
export async function withTransaction<T>(
	callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
	const connection = await getPool().getConnection();

	try {
		await connection.beginTransaction();
		const result = await callback(connection);
		await connection.commit();
		return result;
	} catch (error) {
		await connection.rollback();
		throw error;
	} finally {
		connection.release();
	}
}

/**
 * Execute a query with the pool
 */
export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
	const [rows] = await getPool().execute(sql, params);
	return rows as T;
}

/**
 * Close the connection pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
	if (pool) {
		await pool.end();
		pool = null;
		logger.info('MySQL connection pool closed');
	}
}
