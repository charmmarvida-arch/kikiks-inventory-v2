# Authentication & User Management Deployment

## 🎯 Features Added

### 1. Secure Login System
- **Login Page**: New entry point for the application.
- **First Time Setup**: "Create Admin Account" option on login page to set up the main admin.
- **Protected Routes**: Dashboard is now hidden behind login.

### 2. User Management
- **Register Account**: New page under **Settings** > **Account Register**.
- **Roles**: Admin (Full Access) vs Staff (Limited Access).
- **Staff Name**: Added field to record the staff member's full name.
- **Granular Permissions**:
  - Dashboard Overview
  - FTF Manufacturing
  - Stock Movement
  - Reseller Orders
  - Settings

### 3. Sidebar Updates
- **Dynamic Menu**: Menu items hide if the user doesn't have permission.
- **Logout Button**: Added at the bottom of the sidebar.

---

## 📋 Deployment Steps

### Step 1: Update Database (CRITICAL!)

You **MUST** run this SQL in your Supabase SQL Editor to create the `profiles` table for permissions to work.

1.  Copy the code below.
2.  Go to Supabase > SQL Editor.
3.  Paste and Run.

```sql
-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'staff',
  permissions jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Admins can update profiles." on profiles
  for update using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'admin' )
  );
```

### Step 2: Commit & Push

1.  Open **GitHub Desktop**.
2.  Summary: `Add Authentication and User Management`.
3.  Commit to **main**.
4.  Push origin.

### Step 3: First Time Setup

1.  Once deployed (or locally), go to the Login page.
2.  Click **"First time? Create Admin Account"** at the bottom.
3.  Enter:
    - Email: `kikiksphilippines@gmail.com`
    - Password: `k8k8k8sr0r0`
4.  Click **Create Account**.
5.  You will be logged in as **Admin**.

### Step 4: Create Staff Accounts

1.  Go to **Settings** > **Account Register**.
2.  Enter **Staff Name** (e.g., Juan Dela Cruz).
3.  Enter staff email and password.
4.  Select **Role: Staff**.
5.  Check the boxes for the features they are allowed to see.
6.  Click **Create Account**.

---

## 🧪 Testing

1.  **Login**: Verify admin login works.
2.  **Registration**: Create a staff account with a name and specific permissions.
3.  **Verify**: Log in as that staff member and check if they can only see what you allowed.
