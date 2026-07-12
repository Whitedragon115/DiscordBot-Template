# Discord Bot Template

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
   ```js
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