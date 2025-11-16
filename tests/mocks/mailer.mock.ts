/**
 * Mock implementation of the mailer module
 * Prevents actual emails from being sent during tests
 */

export const sendMail = jest.fn().mockResolvedValue({
	messageId: 'test-message-id',
});

export const verifyConnection = jest.fn().mockResolvedValue(true);

export const mailer = {
	sendMail,
	verifyConnection,
};
