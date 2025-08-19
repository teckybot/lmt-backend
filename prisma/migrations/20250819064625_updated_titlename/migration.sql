/*
  Warnings:

  - You are about to drop the column `leadTitle` on the `user_activity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."user_activity" DROP COLUMN "leadTitle",
ADD COLUMN     "lead_title" VARCHAR(255);
