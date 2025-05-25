# Supabase Setup Guide

Follow these steps to hook the existing PetalPath frontend to Supabase Auth.

## 1. Create a new Supabase project

1. Sign in at https://app.supabase.com and create a new project.
2. Wait for the database to initialise.
3. Navigate to **Project Settings → API** and copy:
   • `Project URL`
   • `anon public` key

## 2. Configure local environment

Create a `.env.local` file in the project root (never commit this file) and add:

```
NEXT_PUBLIC_SUPABASE_URL=<Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

Restart the dev server after saving the file.

## 3. Enable email-password authentication

1. In the Supabase dashboard open **Authentication → Providers**.
2. Enable **Email** provider and press **Save**.
3. Optionally customise the confirmation email in **Email Templates**.

## 4. (Optional) Redirect URLs

If you plan to use Magic Links or Social providers, add the following URLs to **Authentication → URL Configuration**:

• `http://localhost:3002` – local development
• Any production domains you will use later

## 5. Add a `profiles` table (optional)

If you want to store extra information about users:

```sql
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  avatar_url text,
  created_at timestamptz default now()
);
```

Grant Row Level Security and enable `auth.uid() = id` policy so users can only view/update their own profile.

## 6. Install dependencies

```
pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-helpers-react
```

## 7. Available API endpoints

| Method | Endpoint                | Payload                    | Description         |
|--------|-------------------------|----------------------------|---------------------|
| POST   | `/api/auth/signup`      | `{ email, password }`      | Create new account  |
| POST   | `/api/auth/login`       | `{ email, password }`      | Sign in             |
| POST   | `/api/auth/logout`      | _none_                     | Sign out            |

Use `fetch` or any HTTP client from the frontend to call these endpoints.

---

You are now ready to authenticate users from the PetalPath frontend. 