# Vestilo a tu sonso — Setup Guide

## What you have
- Full React web app (Vite + React Router)
- Admin panel with login, inventory table, photo upload
- Public catalogue with search and filters
- WhatsApp button pre-filled with product details
- Days-in-stock tracking with color-coded age indicators
- Supabase backend (real database + photo storage)
- Ready to deploy to Vercel (free)

---

## Step 1 — Create your Supabase project (10 min)

1. Go to **supabase.com** and sign up for free
2. Click **New project**
3. Name it `vestilo` — choose a strong password — region: pick closest to Bolivia (São Paulo)
4. Wait ~2 minutes for it to provision
5. Go to **SQL Editor** → **New query**
6. Copy the entire contents of `SUPABASE_SETUP.sql` and paste it → click **Run**
7. You should see "Success" — this creates your products table and photo storage

### Get your API keys
8. Go to **Settings → API**
9. Copy **Project URL** → this is your `VITE_SUPABASE_URL`
10. Copy **anon public key** → this is your `VITE_SUPABASE_ANON_KEY`

### Create your admin account
11. Go to **Authentication → Users → Add user**
12. Enter your email and a strong password
13. Do the same for each team member who needs admin access

---

## Step 2 — Configure the app (5 min)

1. Copy `.env.example` to a new file called `.env.local`
2. Fill in your values:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_WA_NUMBER=591XXXXXXXXX
```

Replace `591XXXXXXXXX` with your WhatsApp Business number in international format.
Bolivia numbers: `591` + your 8-digit number. Example: `59171234567`

---

## Step 3 — Deploy to Vercel (10 min)

1. Go to **github.com** and create a free account if you don't have one
2. Create a new repository called `vestilo`
3. Upload all these files to that repository

### Deploy
4. Go to **vercel.com** and sign up with your GitHub account
5. Click **Add New Project** → select your `vestilo` repository
6. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
   - `VITE_WA_NUMBER` = your WhatsApp number
7. Click **Deploy**
8. In ~1 minute your app is live at `vestilo.vercel.app`

### Optional: custom domain
- In Vercel → your project → **Domains** → add `vestilo.com` or any domain you buy
- `.com.bo` domains cost ~$20/year from NIC Bolivia (nic.bo)

---

## Step 4 — Test everything

1. Open your Vercel URL on your phone
2. Go to `/admin/login` and log in with your Supabase credentials
3. Add a test product with a photo
4. Log out and check the public catalogue — it should appear
5. Tap the WhatsApp button — it should open WhatsApp with the pre-filled message

---

## Daily workflow

### Adding a product (you or your team)
1. Open your site URL on your phone
2. Go to `/admin` → log in
3. Tap **+ Agregar**
4. Upload photo from camera roll
5. Fill in name, price, size, category, color, styles
6. Tap **Guardar producto**
→ It appears live on the public catalogue immediately

### When something sells
1. Go to `/admin`
2. Find the product (search or scroll)
3. Tap **Vendido**
→ It disappears from the public catalogue immediately

### Checking old stock
- The admin dashboard shows a **+30 días** tab
- Items are color-coded: green (fresh) → orange (30d+) → red (60d+)

---

## Sharing with customers

Your public catalogue URL is simply your site's homepage:
```
https://vestilo.vercel.app
```
(or your custom domain once you set one up)

Share this link on:
- Instagram bio
- WhatsApp status
- WhatsApp Business profile
- TikTok bio

---

## Team access

To give a team member admin access:
1. Go to Supabase → **Authentication → Users → Add user**
2. Create their account with email + password
3. Share the credentials with them
4. They log in at `yoursite.com/admin/login` from any phone or computer

---

## Costs

| Service | Free tier | When you'd pay |
|---------|-----------|----------------|
| Supabase | 500MB DB, 1GB storage, 50k users | If you exceed 1GB photos (~2,000+ hi-res photos) |
| Vercel | Unlimited deploys, 100GB bandwidth | If you get massive traffic |
| Domain | — | ~$10/year for .com, ~$20/year for .com.bo |
| **Total** | **$0/month** | |
