import dotenv from 'dotenv';

dotenv.config();

export const env = {
	port: parseInt(process.env.PORT || '3000', 10),
	nodeEnv: process.env.NODE_ENV || 'development',
	db: {
		host: process.env.DB_HOST || 'localhost',
		port: parseInt(process.env.DB_PORT || '3306', 10),
		user: process.env.DB_USER || 'root',
		password: process.env.DB_PASSWORD || 'admin',
		database: process.env.DB_DATABASE || 'conference_booking',
		connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
	},
	timezone: process.env.TZ || 'Africa/Johannesburg',
	jwt: {
		secret:
			process.env.JWT_SECRET ||
			'your-super-secret-jwt-key-change-this-in-production',
		expiresIn: process.env.JWT_EXPIRES_IN || '7d',
	},
};
