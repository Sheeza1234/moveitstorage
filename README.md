This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Backend

The app has a real backend inside Next.js: every service call from the browser goes to
`POST /api/rpc/<service>/<method>` (`src/app/api/rpc`), which runs the service classes in `src/services/mock`
on the server against a SQLite database (`better-sqlite3`, file `data/moveit.db`).

| Env var | Meaning |
|---|---|
| `MOVEIT_DB_PATH` | database file (default `./data/moveit.db`, `:memory:` for scripts) |
| `MOVEIT_SEED` | `none` = empty database, everything is entered in the portal (default in production); `sample` = demo data (default in development) |

* `npm run db:reset` deletes the local database (it is re-seeded on next start).
* `npm run rpc:gen` regenerates `src/server/rpc-methods.json`, the list of callable methods taken from the
  `I*Service` interfaces (also runs before `dev` and `build`). Methods that are not on an interface are not reachable.
* Scripts under `scripts/` import `src/server/script-registry` (runs as a trusted script) and should be run with
  `MOVEIT_DB_PATH=:memory: npx tsx scripts/<name>.ts`.
* Warehouse structure (floors, zones, racks with rows / levels / positions, open-floor bays) is created and edited from
  **Warehouses -> a warehouse -> Manage Structure**, gated server-side by the `WAREHOUSES` create / edit / delete permissions.

## Sign-in, users and access

* Every page and every API call needs a signed-in user (session cookie, 12 h). `/login` is the only open page.
* **First start:** an administrator account is created. In development it is `admin@moveit.local` / `Admin@12345`, and with
  `MOVEIT_SEED=sample` one extra account per built-in role is created (`<role>@moveit.local` / `Moveit@12345`, for example
  `billing.user@moveit.local`). In production set `MOVEIT_ADMIN_EMAIL` and `MOVEIT_ADMIN_PASSWORD`; if the password is not set a
  random one is generated and printed once in the server log.
* **Users & Access** (menu, Super Admin only): create users, pick a role as a starting preset, then tick exactly which actions
  they get on each module. The menu, the pages and the API all follow that permission set; the dialog previews the menu the
  person will see. You can also disable accounts, reset passwords and delete users. The last active Super Admin cannot be removed.
* Passwords are stored as salted scrypt hashes, 5 wrong attempts lock an account for 5 minutes, and disabling a user or resetting a
  password signs them out immediately.
* The API also enforces access per service (`src/server/access.ts`): hiding a menu item is never the only protection.
* There is no self-service password reset yet: a Super Admin resets it from Users & Access.

Run a second copy without touching a running dev server: `NEXT_DIST_DIR=.next-test npm run build` (and `... npm start`).
