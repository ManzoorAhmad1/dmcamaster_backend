# 📧 HOSTINGER EMAIL SETUP GUIDE

## Hostinger Email Credentials Setup

### ✅ Step 1: Apni Email Details `server.js` mein add karein

`backend/server.js` file open karein aur line 17-24 par apni Hostinger email details update karein:

```javascript
const EMAIL_CONFIG = {
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: 'contact@yourdomain.com',  // ✏️ Apni actual Hostinger email yahan
    pass: 'your-password-here',       // ✏️ Apna email password yahan
  },
};
```

---

## 🔧 Hostinger SMTP Settings

**Default Settings (Already configured):**
- **SMTP Host:** smtp.hostinger.com
- **SMTP Port:** 465 (SSL)
- **Secure:** true
- **Authentication:** Required

**Alternative Port (TLS):**
```javascript
port: 587,
secure: false,
```

---

## 📝 Example Configuration

### Example 1: info@yourdomain.com
```javascript
const EMAIL_CONFIG = {
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: 'info@dmcamaster.com',
    pass: 'MyStr0ngP@ssw0rd',
  },
};
```

### Example 2: contact@yourdomain.com
```javascript
const EMAIL_CONFIG = {
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: 'contact@dmcamaster.com',
    pass: 'SecurePass123!',
  },
};
```

---

## 🚀 Testing

### 1. Server Start Karein:
```bash
cd backend
npm run dev
```

### 2. Test Email Send Karein:

Browser ya Postman se:
```
POST http://localhost:5000/api/send-email

Body (JSON):
{
  "firstName": "Test",
  "email": "test@example.com",
  "message": "Testing Hostinger email"
}
```

### 3. Check Karein:

Email check karein jo aapne `server.js` mein set kiya hai. Contact form se message wahan receive hoga.

---

## 🔒 Security Notes

⚠️ **Important:** 
- Git repository mein credentials commit KARNA MAT
- Production deployment ke liye environment variables use karein
- Strong password use karein

---

## ❌ Common Issues

### Issue: "Invalid login credentials"
**Solution:** 
- Email aur password double-check karein
- Copy-paste errors check karein
- Hostinger cPanel se password reset karein

### Issue: "Connection timeout"
**Solution:**
- Internet connection check karein
- Port 465 blocked hai to port 587 use karein
- Firewall settings check karein

### Issue: "Self-signed certificate"
**Solution:**
Add karo transporter mein:
```javascript
tls: {
  rejectUnauthorized: false
}
```

---

## 📧 Kahan Message Receive Hoga?

Contact form se jo message submit hoga, wo **aapki Hostinger email** par aayega jo aapne `EMAIL_CONFIG.auth.user` mein set ki hai.

Example:
- Apne set kiya: `info@dmcamaster.com`
- Message yahaan receive hoga: `info@dmcamaster.com`

---

## ✨ Quick Start Checklist

- [ ] Hostinger email account banaya
- [ ] `server.js` mein email credentials update kiye (line 17-24)
- [ ] Backend server start kiya: `npm run dev`
- [ ] Frontend se contact form test kiya
- [ ] Email inbox check kiya

---

**Ready! Bas apni email aur password `server.js` mein update karein aur server start karein! 🚀**
