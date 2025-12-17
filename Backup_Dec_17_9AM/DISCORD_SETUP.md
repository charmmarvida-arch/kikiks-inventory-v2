# Discord Transfer Notifications Setup

## ✅ What's Already Done

1. **Discord webhook code** is implemented in `TransferLocation.jsx`
2. **Environment variable** `VITE_DISCORD_TRANSFER_WEBHOOK` is set in your `.env` file
3. **Notification trigger** is configured to send after successful transfer creation

## 🔧 What Was Fixed

Fixed field name bug in Discord notification:
```diff
- { name: '🏪 TO Location', value: orderData.to_location, inline: true },
+ { name: '🏪 TO Location', value: orderData.destination, inline: true },
```

---

## 🧪 Testing Locally

1. **Create a test transfer**:
   - Go to http://localhost:5173/
   - Navigate to Transfer Location
   - Create a transfer order (FROM: FTF Manufacturing, TO: any branch)
   - Submit the transfer

2. **Check your Discord channel** - you should receive a notification with:
   - 📦 New Transfer Location Order
   - FROM and TO locations
   - Items transferred with quantities
   - Total value (if transferring to a branch)

3. **If notification doesn't appear**:
   - Check browser console for errors
   - Verify your Discord webhook URL is valid
   - Make sure the Discord channel hasn't been deleted

---

## 🚀 Deploying to Vercel

To enable Discord notifications in production:

1. **Go to your Vercel dashboard**
2. **Select your project**
3. **Go to Settings → Environment Variables**
4. **Add the following variable**:
   - **Key**: `VITE_DISCORD_TRANSFER_WEBHOOK`
   - **Value**: Your Discord webhook URL
   - **Environment**: Production (and Preview if needed)

5. **Redeploy** your application for changes to take effect

---

## 📋 Discord Notification Format

The notification will include:
- 🏭 **FROM Location**: Source warehouse/branch
- 🏪 **TO Location**: Destination branch/warehouse
- 📅 **Date**: Transfer creation timestamp
- 📋 **Items Transferred**: List of all items with quantities
- 📊 **Total Quantity**: Sum of all items
- 💰 **Total Value**: Included only if transferring to a branch (warehouses don't have pricing)

---

## 🔗 Creating a Discord Webhook (If Needed)

If you need to create a new webhook or update the existing one:

1. **Open your Discord server**
2. **Right-click the channel** where you want notifications
3. **Edit Channel → Integrations → Webhooks**
4. **Create Webhook** or **Copy Webhook URL**
5. **Paste the URL** in your `.env` file:
   ```
   VITE_DISCORD_TRANSFER_WEBHOOK=https://discord.com/api/webhooks/...
   ```

---

## 🎯 Next Steps

1. **Test locally** - Create a transfer and verify Discord notification arrives
2. **Deploy to Vercel** - Add environment variable in Vercel dashboard
3. **Test production** - Create a transfer on your live site
