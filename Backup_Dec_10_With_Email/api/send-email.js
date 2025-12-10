import { Resend } from 'resend';

const resend = new Resend('re_F9e8HACY_AgKFRHHxBYFw2gPARTaVrmNs');

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { to, subject, html, attachments } = request.body;

        const { data, error } = await resend.emails.send({
            from: 'Kikiks Inventory <onboarding@resend.dev>', // Default testing domain
            // In production with a verified domain, change this to 'orders@yourdomain.com'
            to: [to],
            subject: subject || 'New Order Receipt',
            html: html || '<p>Thank you for your order!</p>',
            attachments: attachments || [],
        });

        if (error) {
            return response.status(400).json({ error });
        }

        return response.status(200).json({ data });
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}
