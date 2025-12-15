# 🔧 Fix: Login Redirect to Localhost

The error "This site can't be reached (localhost refused to connect)" happens because **Supabase** is still set up to redirect to your computer (`localhost`) instead of your live website.

## ✅ Step 1: Update Supabase Settings

1.  Go to your **Supabase Dashboard**.
2.  On the left sidebar, click the **Authentication** icon (looks like a users group).
3.  In the inner menu, click **URL Configuration**.
4.  Look for **Site URL**.
    *   Change it from `http://localhost:3000` to:
    *   `https://kikiks-inventory.vercel.app`
5.  Look for **Redirect URLs**.
    *   Click **Add URL**.
    *   Add: `https://kikiks-inventory.vercel.app/**`
6.  Click **Save**.

## ✅ Step 2: Try Logging In Again

Since you already clicked the link, your email is likely **already confirmed**!

1.  Go back to your app: [https://kikiks-inventory.vercel.app](https://kikiks-inventory.vercel.app)
2.  Try to **Sign In** with your email and password.
3.  It should work now without asking for confirmation again.

## 💡 Note
If it still asks for confirmation, you can request a new link, and this time it will redirect correctly because you updated the settings in Step 1.
