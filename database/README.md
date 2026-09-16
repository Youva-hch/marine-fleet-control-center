# Local database

The local database runs PostgreSQL with PostGIS through Docker Compose. SQL files in `migrations/` are applied in filename order when the database volume is created for the first time.

```bash
pnpm db:up
pnpm db:verify
pnpm db:down
```

`pnpm db:down` stops the container without deleting its data. If a migration changes after the volume has already been created, create a new migration instead of editing database state manually.

The local credentials are development-only defaults and match `.env.example`.
