# DMCA Master Backend Server

Backend server for handling email functionality using Express.js and Nodemailer.

## Setup Instructions

### 1. Install Dependencies

Open a NEW terminal (Command Prompt or PowerShell as Administrator) and run:

```bash
cd backend
npm install
```

If you get execution policy error in PowerShell, either:
- Use Command Prompt instead
- Or run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

This will install:
- express (Web framework)
- nodemailer (Email sending)
- cors (Cross-origin resource sharing)
- dotenv (Environment variables)
- nodemon (Development auto-reload)

### 2. Configure Email Settings

Edit the `.env` file and add your email credentials:

```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-specific-password
PORT=5000
```

#### Getting Gmail App Password:
1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Go to Security → App passwords
4. Generate a new app password for "Mail"
5. Copy that password and paste it in EMAIL_PASS

### 3. Start the Server

For development (with auto-reload):
```bash
npm run dev
```

For production:
```bash
npm start
```

Server will run on: `http://localhost:5000`

## API Endpoints

### POST `/api/send-email`
Sends email to admin@dmcamaster.com

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "message": "Your message here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully!"
}
```

### GET `/api/health`
Health check endpoint

**Response:**
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

## Email Services Supported

You can use any of these email services in `.env`:
- Gmail: `service: 'gmail'`
- Outlook: `service: 'outlook'`
- Yahoo: `service: 'yahoo'`
- Or use custom SMTP settings

## Testing

Test the API using:
- Postman
- Thunder Client (VS Code extension)
- cURL:
```bash
curl -X POST http://localhost:5000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "email": "test@example.com",
    "message": "Test message"
  }'
```

## Deployment

For production deployment:
1. Set environment variables on your hosting platform
2. Update CORS settings in server.js if needed
3. Change PORT if required by hosting provider

## Notes

- Admin email is set to: `legal@dmcamaster.com`
- All contact form submissions will be sent to this email
- Make sure to keep your `.env` file secure and never commit it to Git
