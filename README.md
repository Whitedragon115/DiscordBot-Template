# Discord Bot Template

TypeScript and Discord.js bot template with filesystem-discovered commands,
events, and component triggers.

## Development

```sh
npm install
npm run typecheck
npm run dev
```

`npm run dev` executes the TypeScript source directly and restarts when files
change. For production, compile and run the generated ESM output:

```sh
npm run build
npm start
```

Other tools remain available through `npm run dp`, `npm run newcmd`,
`npm run newtri`, `npm run zip`, and `npm run upload`.

# Mysql Prisma install

1. Install Prisma
   ```
   npm install prisma @prisma/client @prisma/adapter-mariadb
   npx prisma init --datasource-provider mysql --output ../generated/prisma
   ```

2. Change .env file
   ```
   DATABASE_USER="username"
   DATABASE_PASSWORD="password"
   DATABASE_NAME="mydb"
   DATABASE_HOST="localhost"
   DATABASE_PORT=3306
   ```

3. Migration to setup database tables
   ```
   npx prisma migrate dev --name init
   ```

   Or if using a exit database run
   ```
   npx prisma db pull
   ```

4. Generate client
   ```
   npx prisma generate
   ```

5. Use Prisma
   ```ts
   import { PrismaClient } from './generated/prisma/client.ts';
   import { PrismaMariaDb } from '@prisma/adapter-mariadb';

   const apdapter = new PrismaMariaDb({
       host: process.env.DATABASE_HOST,
       port: process.env.DATABASE_PORT,
       user: process.env.DATABASE_USER,
       password: process.env.DATABASE_PASSWORD,
       database: process.env.DATABASE_NAME
   })

   const prisma = new PrismaClient({ adapter: apdapter })
   ```
