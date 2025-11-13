import * as fs from 'fs';
import * as path from 'path';

/**
 * Logger with console and file output
 * Logs to both console and rotating log files
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
	private logDir: string;
	private logFile: string;
	private errorLogFile: string;
	private maxLogSize: number = 10 * 1024 * 1024; // 10MB

	constructor() {
		// Create logs directory in project root
		this.logDir = path.join(process.cwd(), 'logs');
		this.logFile = path.join(this.logDir, 'app.log');
		this.errorLogFile = path.join(this.logDir, 'error.log');

		this.ensureLogDirectory();
	}

	private ensureLogDirectory(): void {
		if (!fs.existsSync(this.logDir)) {
			fs.mkdirSync(this.logDir, { recursive: true });
		}
	}

	private formatMessage(level: LogLevel, message: string, meta?: any): string {
		const timestamp = new Date().toISOString();
		const metaString = meta ? ` ${JSON.stringify(meta)}` : '';
		return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
	}

	private writeToFile(filePath: string, message: string): void {
		try {
			// Check file size and rotate if needed
			if (fs.existsSync(filePath)) {
				const stats = fs.statSync(filePath);
				if (stats.size > this.maxLogSize) {
					const timestamp = new Date().toISOString().replace(/:/g, '-');
					const archivePath = filePath.replace('.log', `-${timestamp}.log`);
					fs.renameSync(filePath, archivePath);
				}
			}

			// Append to log file
			fs.appendFileSync(filePath, message + '\n', 'utf8');
		} catch (error) {
			// If file logging fails, only log to console
			console.error('Failed to write to log file:', error);
		}
	}

	info(message: string, meta?: any): void {
		const formatted = this.formatMessage('info', message, meta);
		console.log(formatted);
		this.writeToFile(this.logFile, formatted);
	}

	warn(message: string, meta?: any): void {
		const formatted = this.formatMessage('warn', message, meta);
		console.warn(formatted);
		this.writeToFile(this.logFile, formatted);
	}

	error(message: string, meta?: any): void {
		const formatted = this.formatMessage('error', message, meta);
		console.error(formatted);
		this.writeToFile(this.logFile, formatted);
		this.writeToFile(this.errorLogFile, formatted);
	}

	debug(message: string, meta?: any): void {
		const formatted = this.formatMessage('debug', message, meta);
		console.debug(formatted);
		this.writeToFile(this.logFile, formatted);
	}
}

export const logger = new Logger();
