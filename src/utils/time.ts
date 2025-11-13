/**
 * Time utilities for business hours and duration validation
 */

export const BUSINESS_HOURS = {
	START: 9, // 09:00
	END: 17, // 17:00 (5 PM)
} as const;

export const BOOKING_DURATION = {
	MIN_MINUTES: 30,
	MAX_MINUTES: 240, // 4 hours
} as const;

/**
 * Check if a time is within business hours
 */
export function isWithinBusinessHours(date: Date): boolean {
	const hour = date.getHours();
	return hour >= BUSINESS_HOURS.START && hour < BUSINESS_HOURS.END;
}

/**
 * Validate that both start and end times are within business hours
 */
export function validateBusinessHours(startTime: Date, endTime: Date): boolean {
	const startHour = startTime.getHours();
	const startMinute = startTime.getMinutes();
	const endHour = endTime.getHours();
	const endMinute = endTime.getMinutes();

	// Start must be at or after 09:00
	if (startHour < BUSINESS_HOURS.START) {
		return false;
	}

	// End must be at or before 17:00
	if (
		endHour > BUSINESS_HOURS.END ||
		(endHour === BUSINESS_HOURS.END && endMinute > 0)
	) {
		return false;
	}

	return true;
}

/**
 * Calculate duration in minutes between two dates
 */
export function getDurationMinutes(startTime: Date, endTime: Date): number {
	return Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
}

/**
 * Validate booking duration (30 min - 4 hours)
 */
export function validateDuration(startTime: Date, endTime: Date): boolean {
	const duration = getDurationMinutes(startTime, endTime);
	return (
		duration >= BOOKING_DURATION.MIN_MINUTES &&
		duration <= BOOKING_DURATION.MAX_MINUTES
	);
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
	return date.toISOString().split('T')[0];
}

/**
 * Parse YYYY-MM-DD string to Date
 */
export function parseDate(dateString: string): Date {
	const date = new Date(dateString);
	if (isNaN(date.getTime())) {
		throw new Error('Invalid date format');
	}
	return date;
}

/**
 * Generate 30-minute time slots between business hours
 */
export function generateTimeSlots(
	date: Date
): Array<{ start: Date; end: Date }> {
	const slots: Array<{ start: Date; end: Date }> = [];
	const year = date.getFullYear();
	const month = date.getMonth();
	const day = date.getDate();

	for (let hour = BUSINESS_HOURS.START; hour < BUSINESS_HOURS.END; hour++) {
		for (let minute = 0; minute < 60; minute += 30) {
			const start = new Date(year, month, day, hour, minute);
			const end = new Date(year, month, day, hour, minute + 30);

			// Only include slots that end before or at business closing
			if (
				end.getHours() < BUSINESS_HOURS.END ||
				(end.getHours() === BUSINESS_HOURS.END && end.getMinutes() === 0)
			) {
				slots.push({ start, end });
			}
		}
	}

	return slots;
}
