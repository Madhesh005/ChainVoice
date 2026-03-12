# 🚀 Deployment Guide

## Quick Deploy Options

### Option 1: Vercel (Recommended)

1. Push your code to GitHub (already done ✅)
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository: `tharunkumardeveloper/Chainvoice`
5. Vercel will auto-detect Vite settings
6. Click "Deploy"

**Important**: The `vercel.json` file is already configured to handle client-side routing properly. No additional configuration needed!

Your site will be live at: `https://chainvoice.vercel.app`

### Vercel Configuration (Already Included)

The project includes a `vercel.json` file that:
- Rewrites all routes to `/index.html` for client-side routing
- Adds proper caching headers for assets
- Prevents 404 errors on page refresh

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Option 2: Netlify

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select `Chainvoice`
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click "Deploy"

### Option 3: GitHub Pages

```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts:
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"

# Update vite.config.ts:
export default defineConfig({
  plugins: [react()],
  base: '/Chainvoice/'
})

# Deploy
npm run deploy
```

Your site will be at: `https://tharunkumardeveloper.github.io/Chainvoice/`

### Option 4: Self-Hosted (VPS/Cloud)

```bash
# Build the project
npm run build

# The dist/ folder contains your production build
# Upload to your server and serve with nginx/apache

# Example nginx config:
server {
    listen 80;
    server_name chainvoice.yourdomain.com;
    root /var/www/chainvoice/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Environment Variables

Currently, the app doesn't require environment variables. For production with real blockchain integration, you'll need:

```env
VITE_HYPERLEDGER_API_URL=https://api.chainvoice.com
VITE_IPFS_GATEWAY=https://ipfs.chainvoice.com
VITE_GSTN_API_KEY=your_gstn_api_key
```

## Performance Optimization

The build is already optimized with:
- ✅ Code splitting
- ✅ Tree shaking
- ✅ Minification
- ✅ Gzip compression
- ✅ Asset optimization

Current build size: ~265KB JS + ~25KB CSS (gzipped: ~71KB + ~5KB)

## Custom Domain

After deploying to Vercel/Netlify:
1. Go to project settings
2. Add your custom domain
3. Update DNS records as instructed
4. SSL certificate will be auto-provisioned

## Monitoring

Recommended tools:
- **Analytics**: Vercel Analytics, Google Analytics
- **Error Tracking**: Sentry
- **Performance**: Lighthouse CI, Web Vitals

## Support

For deployment issues, open an issue on GitHub:
https://github.com/tharunkumardeveloper/Chainvoice/issues
