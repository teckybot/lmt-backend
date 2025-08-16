/*
  Warnings:

  - You are about to drop the column `previousLogin` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "previousLogin",
ADD COLUMN     "previous_login" TIMESTAMP(3);
