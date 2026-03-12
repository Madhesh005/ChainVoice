# 🔧 Vercel Deployment Troubleshooting

## Problem: 404 Errors on Page Refresh

### ✅ Solution Implemented

The 404 errors have been fixed with the following changes:

### 1. Added `vercel.json` Configuration

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**What this does:**
- Rewrites all routes to `/index.html` for client-side routing
- Adds proper caching headers for static assets
- Prevents 404 errors when users refresh the page or access direct URLs

### 2. Created Custom 404 Page

Added `src/pages/NotFound.tsx` with:
- Animated 404 display
- Quick navigation links
- Back to home button
- Branded design matching ChainVoice theme

### 3. Added Catch-All Route

Updated `src/App.tsx` to include:
```tsx
<Route path="*" element={<NotFound />} />
```

This catches any unmatched routes and shows the custom 404 page.

### 4. Added Netlify Support

Created `public/_redirects` for Netlify compatibility:
```
/*    /index.html   200
```

---

## How Client-Side Routing Works

### The Problem
Single Page Applications (SPAs) like React use client-side routing:
- All routes are handled by JavaScript
- Server only serves `/index.html`
- When you refresh `/msme/dashboard`, the server looks for that file (doesn't exist)
- Result: 404 error

### The Solution
The `vercel.json` configuration tells Vercel:
1. For ANY route request (`/*`)
2. Serve the `/index.html` file
3. Let React Router handle the routing client-side

---

## Deployment Steps

### First Time Deployment

1. **Push to GitHub** (already done ✅)
   ```bash
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import `tharunkumardeveloper/Chainvoice`
   - Click "Deploy"

3. **Automatic Configuration**
   - Vercel auto-detects Vite
   - Reads `vercel.json` automatically
   - No manual configuration needed!

### Subsequent Deployments

Every push to `main` branch automatically triggers a new deployment.

---

## Testing the Fix

### Test These URLs After Deployment:

1. **Root**: `https://your-app.vercel.app/`
   - Should show landing page ✅

2. **Auth Routes**: 
   - `https://your-app.vercel.app/auth/login`
   - `https://your-app.vercel.app/auth/register`
   - Should work on direct access ✅

3. **Dashboard Routes**:
   - `https://your-app.vercel.app/msme/dashboard`
   - `https://your-app.vercel.app/lender/dashboard`
   - `https://your-app.vercel.app/regulator/dashboard`
   - Should work on refresh ✅

4. **Deep Links**:
   - `https://your-app.vercel.app/msme/invoices/upload`
   - `https://your-app.vercel.app/shared/blockchain-explorer`
   - Should work when shared ✅

5. **404 Page**:
   - `https://your-app.vercel.app/nonexistent-page`
   - Should show custom 404 page ✅

---

## Common Issues & Solutions

### Issue 1: Still Getting 404s

**Solution:**
- Make sure `vercel.json` is in the root directory
- Redeploy the project
- Clear browser cache (Ctrl+Shift+R)

### Issue 2: Assets Not Loading

**Solution:**
- Check that assets are in the `public/` folder
- Verify build output in `dist/` folder
- Check browser console for errors

### Issue 3: Environment Variables

**Solution:**
- Add env vars in Vercel dashboard
- Prefix with `VITE_` for Vite apps
- Redeploy after adding variables

### Issue 4: Build Fails

**Solution:**
```bash
# Test build locally first
npm run build

# Check for TypeScript errors
npm run build 2>&1 | grep error

# Fix any errors and push again
```

---

## Vercel Dashboard Settings

### Build & Development Settings

These are auto-detected, but verify:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Environment Variables (if needed)

For production with real APIs:
```
VITE_HYPERLEDGER_API_URL=https://api.chainvoice.com
VITE_IPFS_GATEWAY=https://ipfs.chainvoice.com
VITE_GSTN_API_KEY=your_api_key_here
```

---

## Performance Optimization

### Current Setup Includes:

1. **Asset Caching**
   - Static assets cached for 1 year
   - Configured in `vercel.json`

2. **Gzip Compression**
   - Automatic on Vercel
   - Reduces bundle size by ~70%

3. **CDN Distribution**
   - Vercel Edge Network
   - Global distribution

4. **Code Splitting**
   - Automatic with Vite
   - Lazy loading by route

---

## Monitoring & Analytics

### Vercel Analytics (Free)

Enable in Vercel dashboard:
- Page views
- Unique visitors
- Performance metrics
- Error tracking

### Recommended Tools

- **Lighthouse**: Performance audits
- **Sentry**: Error tracking
- **LogRocket**: Session replay
- **Google Analytics**: User behavior

---

## Custom Domain Setup

### After Deployment:

1. Go to Vercel project settings
2. Click "Domains"
3. Add your domain (e.g., `chainvoice.com`)
4. Update DNS records as instructed:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
5. SSL certificate auto-provisioned

---

## Rollback Strategy

### If Something Goes Wrong:

1. **Instant Rollback**
   - Go to Vercel dashboard
   - Click "Deployments"
   - Find previous working deployment
   - Click "..." → "Promote to Production"

2. **Git Revert**
   ```bash
   git revert HEAD
   git push origin main
   ```

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Vite Docs**: https://vitejs.dev/guide/
- **React Router**: https://reactrouter.com/
- **GitHub Issues**: https://github.com/tharunkumardeveloper/Chainvoice/issues

---

## Checklist Before Going Live

- [x] `vercel.json` configured
- [x] Custom 404 page created
- [x] All routes tested
- [x] Mobile responsive
- [x] Build succeeds locally
- [x] No console errors
- [x] Assets loading correctly
- [x] SEO meta tags added
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled (optional)
- [ ] Error tracking setup (optional)

---

**Status**: ✅ All routing issues fixed and ready for production deployment!
