# 🚀 MedWard Pro - Quick Start Guide

**All security fixes are complete and deployed!** Follow these steps to get your production instance running.

## ⚡ Quick Deploy (5 Steps)

### 1️⃣ Get ReCaptcha Site Key (2 minutes)

1. Go to https://www.google.com/recaptcha/admin
2. Click "+" → Create new site
3. Select "reCAPTCHA v3"
4. Add domains: `localhost`, `your-project.web.app`
5. **Copy the Site Key**

### 2️⃣ Configure Environment (1 minute)

```bash
# Copy and edit .env
cp .env.example .env
```

Edit `.env`:
```bash
# Get these from Firebase Console → Project Settings → Your apps
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_PROJECT_ID=your-project-id
# ... (copy all Firebase values)

# Paste the ReCaptcha key from Step 1
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key

# Set to false for production
VITE_USE_EMULATORS=false
```

### 3️⃣ Set Firebase Secrets (1 minute)

```bash
cd functions
firebase functions:secrets:set ANTHROPIC_API_KEY
# Paste your Claude API key when prompted
cd ..
```

### 4️⃣ Deploy Security First (2 minutes)

```bash
# Install dependencies
npm install

# Deploy security rules FIRST
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

### 5️⃣ Deploy Everything (3 minutes)

```bash
# Build and deploy everything
npm run deploy
```

**Done!** Your app is live at `https://your-project.web.app` 🎉

---

## ✅ Verify Deployment

1. **Open your app**: `https://your-project.web.app`
2. **Sign up** with a test account
3. **Create a patient** - should work
4. **Check Firestore** - verify patient was created
5. **Test AI features** - should work without errors

---

## 🔐 Security Checklist

Your app now has:

- ✅ **App Check** - Prevents function abuse
- ✅ **PHI Protection** - Only authorized users can access patient data
- ✅ **Role Security** - Users can't self-assign admin
- ✅ **Authorization** - All Cloud Functions verify access
- ✅ **Logout Cleanup** - PHI cleared from browser
- ✅ **Secure Rules** - Firestore/Storage properly locked down

---

## 🆘 Quick Troubleshooting

### "App Check token is invalid"
**Fix**: Verify `VITE_RECAPTCHA_SITE_KEY` in `.env` matches the key from reCAPTCHA admin console

### "Permission denied" on Firestore
**Fix**: Make sure security rules are deployed:
```bash
firebase deploy --only firestore:rules
```

### Functions timing out
**Fix**: Verify Anthropic API key is set:
```bash
firebase functions:secrets:access ANTHROPIC_API_KEY
```

### Build fails
**Fix**: Clear and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Full Documentation

For complete details, see:
- **[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)** - Complete deployment guide
- **[README.md](README.md)** - Project overview
- **[firestore.rules](firestore.rules)** - Security rules

---

## 🎯 What's Next?

After deployment:

1. **Create Admin User**
   - Sign up with your email
   - Go to Firestore Console → `users` collection
   - Change your `role` to `admin`

2. **Configure App Check in Firebase**
   - Firebase Console → App Check
   - Register your web app with the same ReCaptcha key

3. **Test Everything**
   - User signup/login
   - Create/edit patients
   - AI features (chat, handover)
   - Tasks and on-call list
   - Google Sheets import

4. **Set Up Monitoring**
   - Firebase Console → Analytics
   - Set up error alerts
   - Monitor Cloud Functions usage

---

## 💡 Pro Tips

- **Use the emulator for development**: Set `VITE_USE_EMULATORS=true` in `.env`
- **Deploy often**: Security rules update instantly with `firebase deploy --only firestore:rules`
- **Monitor costs**: Check Firebase Console → Usage & billing
- **Backup data**: Set up automated Firestore exports

---

**Need help?** Check [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) for detailed troubleshooting.

**Everything working?** You're ready to start using MedWard Pro! 🏥✨
