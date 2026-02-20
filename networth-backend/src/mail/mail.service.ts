import { Injectable, Logger } from '@nestjs/common';


@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    // Hardcoded for now as per user request
    private readonly mailjetApiKey = 'd0073d29164d2bb76f8d8276a04da792';
    private readonly mailjetApiSecret = '1fc867ef5948ba998bece3c36c16ba7d';
    private readonly fromEmail = 'noreply@fortstec.com';

    async sendPasswordResetEmail(toEmail: string, resetLink: string) {
        const auth = Buffer.from(`${this.mailjetApiKey}:${this.mailjetApiSecret}`).toString('base64');

        const data = {
            Messages: [
                {
                    From: {
                        Email: this.fromEmail,
                        Name: 'Fortstec',
                    },
                    To: [
                        {
                            Email: toEmail,
                        },
                    ],
                    Subject: 'Reset your Fortstec password',
                    HTMLPart: `
            <h3>Password Reset Request</h3>
            <p>You recently requested to reset your password for your Fortstec account. Click the link below to proceed:</p>
            <br>
            <p><a href="${resetLink}">Reset Password</a></p>
            <br>
            <p>If you did not request a password reset, please ignore this email. This link will expire in 15 minutes.</p>
          `,
                    TextPart: `You recently requested to reset your password for your Fortstec account. Please go to the following link to reset your password: ${resetLink}. This link will expire in 15 minutes.`,
                },
            ],
        };

        try {
            this.logger.log(`Attempting to send reset email to ${toEmail}`);
            const response = await fetch('https://api.mailjet.com/v3.1/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${auth}`,
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Mailjet API Error: ${response.status} ${response.statusText} - ${errorData}`);
            }

            const responseData = await response.json();
            this.logger.log(`Email sent successfully to ${toEmail}, Mailjet Response: ${JSON.stringify(responseData.Messages[0].Status)}`);
        } catch (error: any) {
            this.logger.error(`Failed to send email to ${toEmail}`);
            this.logger.error(error.message || error);
        }
    }
}
