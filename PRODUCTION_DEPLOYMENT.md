# MedWard Pro - Production Deployment Guide

This guide walks you through deploying MedWard Pro to production with all security features enabled.

## 🔒 Security Status

✅ **All critical security vulnerabilities fixed**
- Role escalation prevented
- PHI access properly restricted
- Cloud Functions authorization enforced
- App Check enabled to prevent abuse
- Patient data locked down to authorized users only
- PHI cleanup on logout
- Production logging sanitized

## Prerequisites

- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Firebase project created (https://console.firebase.google.com)
- [ ] Google reCAPTCHA v3 site registered (https://www.google.com/recaptcha/admin)
- [ ] Anthropic API key for Claude AI (stored as Firebase secret)

---

## Step 1: Configure Firebase Project

### 1.1 Create Firebase Project (if not done)

```bash
# Login to Firebase
firebase login

# Initialize project (if not already done)
firebase init

# Select:
# - Hosting
# - Firestore
# - Storage
# - Functions
```

### 1.2 Get Your Firebase Config

1. Go to Firebase Console → Project Settings → Your apps
2. Click "Add app" → Web app
3. Copy the configuration values
4. Update your `.env` file:

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your Firebase config
VITE_FIREBASE_API_KEY=your-actual-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Disable emulators for production
VITE_USE_EMULATORS=false
```

---

## Step 2: Set Up App Check (Required for Security)

App Check prevents unauthorized access to your Cloud Functions.

### 2.1 Register with reCAPTCHA v3

1. Go to https://www.google.com/recaptcha/admin
2. Click "+" to register a new site
3. Choose reCAPTCHA v3
4. Add your domains:
   - `localhost` (for local testing)
   - `your-project.web.app`
   - `your-project.firebaseapp.com`
   - Your custom domain (if any)
5. Copy the **Site Key**

### 2.2 Configure App Check in Firebase

1. Go to Firebase Console → App Check
2. Click "Register" next to your web app
3. Select "reCAPTCHA v3"
4. Paste your site key
5. Click "Save"

### 2.3 Add Site Key to Environment

```bash
# Edit .env
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key-here
```

---

## Step 3: Configure Cloud Functions Secrets

### 3.1 Set Anthropic API Key

```bash
# Navigate to functions directory
cd functions

# Set the secret (you'll be prompted to enter it)
firebase functions:secrets:set ANTHROPIC_API_KEY
```

Enter your Anthropic API key when prompted.

---

## Step 4: Install Dependencies

```bash
# Install root dependencies
npm install

# Install function dependencies
cd functions
npm install
cd ..
```

---

## Step 5: Build and Test Locally

### 5.1 Test with Emulators

```bash
# Make sure VITE_USE_EMULATORS=true in .env
# Start emulators
npm run firebase:emulators
```

Test the following:
- [ ] User signup (should NOT allow admin role)
- [ ] Patient creation (should work)
- [ ] Accessing own patients (should work)
- [ ] Accessing other users' patients (should be denied)
- [ ] Logout clears all PHI from browser storage

### 5.2 Build for Production

```bash
# Build frontend
npm run build

# Build functions
cd functions
npm run build
cd ..
```

---

## Step 6: Deploy Security Rules First

**IMPORTANT**: Deploy security rules before deploying functions to ensure protection is in place.

```bash
# Deploy Firestore rules, indexes, and Storage rules
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

Verify in Firebase Console:
- Go to Firestore → Rules → View deployed rules
- Confirm you see the updated security rules

---

## Step 7: Deploy Functions

```bash
# Deploy Cloud Functions with predeploy build hook
firebase deploy --only functions
```

This will:
1. Automatically build functions (via predeploy hook)
2. Deploy all 6 functions with App Check enabled

Expected functions:
- `analyzeWithAI`
- `generateSBAR`
- `clinicalChat`
- `generateHandover`
- `analyzeLabImage`
- `aiGateway`

---

## Step 8: Deploy Hosting

```bash
# Deploy frontend
firebase deploy --only hosting
```

Your app will be available at:
- `https://your-project.web.app`
- `https://your-project.firebaseapp.com`

---

## Step 9: Create Admin User

Since users can no longer self-assign admin role (security fix), create the first admin via Firestore Console:

1. Go to Firebase Console → Firestore Database
2. Find the `users` collection
3. Find your user document (created when you first sign up)
4. Edit the document:
   - Change `role` from `physician` to `admin`
5. Save

---

## Step 10: Full Production Deploy (All-in-One)

For subsequent deployments, use:

```bash
# Deploy everything at once
npm run deploy
```

This will:
1. Build frontend
2. Build functions (via predeploy hook)
3. Deploy hosting, functions, rules, and indexes

---

## Verification Checklist

After deployment, verify:

### Security Tests
- [ ] **Role escalation blocked**: Try creating a new account → should default to `physician`, not `admin`
- [ ] **Patient access control**: User A cannot see User B's patients
- [ ] **Task authorization**: Tasks are only visible to assigned users
- [ ] **App Check working**: Cloud Functions reject requests without valid App Check token
- [ ] **Logout cleanup**: Browser storage is cleared after logout

### Functional Tests
- [ ] User signup/login works
- [ ] Create patient works
- [ ] View patient list works
- [ ] Edit patient works
- [ ] Tasks work
- [ ] AI features work (chat, handover, SBAR)
- [ ] Lab image upload works
- [ ] Google Sheets import works

### Performance
- [ ] App loads in < 3 seconds
- [ ] No console errors in production
- [ ] All Cloud Functions respond within timeout

---

## Monitoring and Maintenance

### Monitor App Check

Go to Firebase Console → App Check → Metrics

Watch for:
- **High rejection rate**: May indicate configuration issues
- **Unusual traffic patterns**: May indicate abuse attempts

### Monitor Cloud Functions

Go to Firebase Console → Functions → Dashboard

Check:
- Invocation count
- Error rate
- Execution time
- Memory usage

### Monitor Security Rules

Go to Firebase Console → Firestore → Rules → Usage

Look for:
- Denied reads/writes (may indicate attackers)
- Unusual query patterns

---

## Rollback Procedure

If something goes wrong:

```bash
# Rollback hosting only
firebase hosting:rollback

# Rollback functions
# (Go to Firebase Console → Functions → select function → Rollback tab)

# Revert security rules
git revert <commit-hash>
firebase deploy --only firestore:rules
```

---

## Environment Variables Summary

Required for production:

```bash
# Firebase Config
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx

# Security
VITE_RECAPTCHA_SITE_KEY=xxx
VITE_USE_EMULATORS=false
```

Firebase Function Secret:
```bash
ANTHROPIC_API_KEY=sk-ant-xxx  # Set via: firebase functions:secrets:set ANTHROPIC_API_KEY
```

---

## Troubleshooting

### App Check Token Errors

**Symptom**: Cloud Functions return "App Check token is invalid"

**Fix**:
1. Verify reCAPTCHA site key in .env matches Firebase Console
2. Check that your domain is registered in reCAPTCHA admin
3. Clear browser cache and reload
4. Check browser console for App Check errors

### Permission Denied on Firestore

**Symptom**: "Missing or insufficient permissions"

**Fix**:
1. Verify security rules are deployed: `firebase deploy --only firestore:rules`
2. Check that user is logged in
3. For patient access: verify user is creator or in `assignedClinicians` array
4. Check Firestore Rules simulator in Firebase Console

### Functions Not Working

**Symptom**: Functions timeout or return errors

**Fix**:
1. Check Firebase Console → Functions → Logs
2. Verify `ANTHROPIC_API_KEY` is set: `firebase functions:secrets:access ANTHROPIC_API_KEY`
3. Check function region matches (europe-west1)
4. Verify App Check is configured

### Build Errors

**Symptom**: `npm run build` fails

**Fix**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear function dependencies
cd functions
rm -rf node_modules package-lock.json
npm install
cd ..

# Try again
npm run build
```

---

## Support

For issues specific to MedWard:
- Check the main README.md
- Review security commit: `cf2d6a3`
- Check Firestore rules in `firestore.rules`

For Firebase issues:
- Firebase Documentation: https://firebase.google.com/docs
- Firebase Support: https://firebase.google.com/support

---

## Next Steps After Deployment

1. **Set up custom domain** (optional)
   - Firebase Console → Hosting → Add custom domain
   - Follow DNS configuration steps
   - Update reCAPTCHA allowed domains

2. **Enable Google Analytics** (optional)
   - Firebase Console → Analytics
   - Follow setup instructions

3. **Set up monitoring alerts** (recommended)
   - Firebase Console → Alerts
   - Configure alerts for errors, performance, security

4. **Regular backups** (highly recommended for clinical data)
   - Set up automated Firestore exports
   - Firebase Console → Firestore → Import/Export

---

**🎉 Congratulations! Your MedWard Pro instance is now live and secure!**
