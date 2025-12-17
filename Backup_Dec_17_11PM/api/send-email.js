import nodemailer from 'nodemailer';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { to, subject, html, attachments } = request.body;

        // Create a transporter using Gmail
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, // Your Gmail address
                pass: process.env.EMAIL_PASS  // Your Gmail App Password
            }
        });

        const mailOptions = {
            from: `"Kikiks Inventory" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject || 'New Order Receipt',
            html: html || '<p>Thank you for your order!</p>',
            attachments: attachments || []
        };

        const info = await transporter.sendMail(mailOptions);

        return response.status(200).json({ success: true, messageId: info.messageId });

    } catch (error) {
        console.error('Email error:', error);
        return response.status(500).json({ error: error.message });
    }
}
