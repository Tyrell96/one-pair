/*
  Warnings:

  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nickname]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- First, add the new columns without dropping email
ALTER TABLE "User" 
ADD COLUMN "bankAccount" TEXT NOT NULL DEFAULT '',
ADD COLUMN "nickname" TEXT NOT NULL DEFAULT '',
ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';

-- Update nickname with email values (removing @domain.com part)
UPDATE "User" 
SET nickname = SUBSTRING(email FROM 1 FOR POSITION('@' IN email) - 1)
WHERE email LIKE '%@%';

-- Now drop the email column and its index
DROP INDEX "User_email_key";
ALTER TABLE "User" DROP COLUMN "email";

-- Create unique index for nickname
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");
