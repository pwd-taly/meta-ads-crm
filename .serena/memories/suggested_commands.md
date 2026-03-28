# Suggested Commands for Development

## Development
- `npm run dev` - Start Next.js dev server (localhost:3000)
- `npx prisma studio` - Open Prisma Studio for database GUI

## Database
- `npx prisma format` - Format schema.prisma
- `npx prisma migrate dev --name <migration-name>` - Create and apply migration
- `npx prisma db push` - Push schema changes to DB
- `npm run db:seed` - Run database seeder

## Building & Testing
- `npm run build` - Build production bundle
- `npm run start` - Start production server

## Git
- `git add <files>` - Stage changes
- `git commit -m "message"` - Commit changes
- `git push` - Push to remote
- `git log --oneline -10` - View recent commits

## Verification
- After each task: `npm run build` to ensure no TypeScript errors
- Test endpoints with curl or Postman
- Check Prisma Studio for data validation
