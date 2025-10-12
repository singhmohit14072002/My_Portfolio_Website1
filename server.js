const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify email configuration on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('Email configuration error:', error);
    } else {
        console.log('Server is ready to send emails');
    }
});

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Please fill in all fields' });
    }

    try {
        // Email to you (the portfolio owner)
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: 'New Contact Form Submission',
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);
        console.log('Email sent to owner successfully');

        // Auto-reply to the sender
        const autoReplyOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Thank you for contacting me',
            html: `
                <h2>Thank you for reaching out!</h2>
                <p>Dear ${name},</p>
                <p>I have received your message and will get back to you as soon as possible.</p>
                <p>Best regards,<br>${process.env.EMAIL_USER}</p>
            `
        };

        await transporter.sendMail(autoReplyOptions);
        console.log('Auto-reply sent successfully');

        res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error details:', error);
        res.status(500).json({ 
            error: 'Failed to send email. Please try again later.',
            details: error.message 
        });
    }
});

// Health check endpoint for Azure
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Default route
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('Email configuration:', {
        user: process.env.EMAIL_USER ? 'Set' : 'Not set',
        pass: process.env.EMAIL_PASS ? 'Set' : 'Not set'
    });
}); 