const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// HOSTINGER EMAIL CONFIGURATION
// Apni Hostinger email credentials yahan add karein
// ============================================
const EMAIL_CONFIG = {
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true, // true for 465, false for 587
  auth: {
    user: 'legal@dmcamaster.com', // Apka Hostinger email yahan lagayen
    pass: 'Se^jhEe7',  // Apka email password yahan lagayen
  },
};

// Create nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport(EMAIL_CONFIG);
};

// Email sending route
app.post('/api/send-email', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;

    // Validate required fields
    if (!firstName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: firstName, email, and message',
      });
    }

    const transporter = createTransporter();

    // Email to admin
    const mailOptions = {
      from: EMAIL_CONFIG.auth.user, // Sender email
      to: EMAIL_CONFIG.auth.user,   // Aapki email jahan message receive hoga
      subject: `New Contact Form Submission from ${firstName} ${lastName || ''}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Contact Form Submission</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #2D3748;">
          <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom right, #ffffff, #f8fafc);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0B1F3B 0%, #2D3748 100%); padding: 40px 30px; text-align: center; border-radius: 0;">
              <div style="display: inline-block; background-color: #D4AF37; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                <span style="color: #0B1F3B; font-size: 30px; font-weight: bold;">✉</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px;">
                New Contact Request
              </h1>
              <p style="color: #D4AF37; margin: 10px 0 0 0; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
                DMCA Master
              </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              
              <!-- Contact Information Card -->
              <div style="background-color: #ffffff; border: 2px solid #D4AF37; border-radius: 12px; padding: 25px; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(212, 175, 55, 0.1);">
                <h2 style="color: #0B1F3B; margin: 0 0 20px 0; font-size: 18px; font-weight: 700; border-bottom: 2px solid #D4AF37; padding-bottom: 10px;">
                  Contact Information
                </h2>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; vertical-align: top;">
                      <strong style="color: #0B1F3B; font-size: 14px; display: inline-block; min-width: 100px;">
                        👤 Name:
                      </strong>
                    </td>
                    <td style="padding: 12px 0; color: #2D3748; font-size: 14px;">
                      ${firstName} ${lastName || ''}
                    </td>
                  </tr>
                  <tr style="border-top: 1px solid #f8fafc;">
                    <td style="padding: 12px 0; vertical-align: top;">
                      <strong style="color: #0B1F3B; font-size: 14px; display: inline-block; min-width: 100px;">
                        📧 Email:
                      </strong>
                    </td>
                    <td style="padding: 12px 0; color: #2D3748; font-size: 14px;">
                      <a href="mailto:${email}" style="color: #D4AF37; text-decoration: none; font-weight: 500;">
                        ${email}
                      </a>
                    </td>
                  </tr>
                  <tr style="border-top: 1px solid #f8fafc;">
                    <td style="padding: 12px 0; vertical-align: top;">
                      <strong style="color: #0B1F3B; font-size: 14px; display: inline-block; min-width: 100px;">
                        📱 Phone:
                      </strong>
                    </td>
                    <td style="padding: 12px 0; color: #2D3748; font-size: 14px;">
                      ${phone || '<span style="color: #9ca3af; font-style: italic;">Not provided</span>'}
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Message Card -->
              <div style="background: linear-gradient(to right, #f8fafc, #ffffff); border-left: 5px solid #D4AF37; border-radius: 8px; padding: 25px; margin-bottom: 30px; box-shadow: 0 2px 8px rgba(11, 31, 59, 0.08);">
                <h3 style="color: #0B1F3B; margin: 0 0 15px 0; font-size: 16px; font-weight: 700; display: flex; align-items: center;">
                  <span style="display: inline-block; width: 30px; height: 30px; background-color: #D4AF37; border-radius: 50%; margin-right: 10px; text-align: center; line-height: 30px;">
                    💬
                  </span>
                  Message
                </h3>
                <div style="color: #2D3748; font-size: 15px; line-height: 1.6; background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                  ${message.replace(/\n/g, '<br>')}
                </div>
              </div>
              
              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="mailto:${email}" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #CD7F32 100%); color: #0B1F3B; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3); transition: all 0.3s ease;">
                  Reply to ${firstName}
                </a>
              </div>
              
            </div>
            
            <!-- Footer -->
            <div style="background-color: #0B1F3B; padding: 30px; text-align: center; border-top: 3px solid #D4AF37;">
              <p style="color: #D4AF37; margin: 0 0 8px 0; font-size: 13px; font-weight: 600;">
                DMCA Master - Professional Legal Services
              </p>
              <p style="color: #9ca3af; margin: 0; font-size: 12px; line-height: 1.5;">
                Received: ${new Date().toLocaleString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p style="color: #6b7280; margin: 15px 0 0 0; font-size: 11px;">
                This email was sent from the DMCA Master contact form.
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Email sent successfully!',
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email. Please try again later.',
      error: error.message,
    });
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Email API endpoint: http://localhost:${PORT}/api/send-email`);
});
