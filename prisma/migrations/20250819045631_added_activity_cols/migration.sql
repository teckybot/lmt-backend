/*
  Warnings:

  - You are about to drop the column `activity` on the `user_activity` table. All the data in the column will be lost.
  - Added the required column `action` to the `user_activity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `details` to the `user_activity` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('CREATED', 'UPDATED', 'CLOSED');

-- AlterTable
ALTER TABLE "public"."user_activity" DROP COLUMN "activity",
ADD COLUMN     "action" "public"."ActivityType" NOT NULL,
ADD COLUMN     "details" TEXT NOT NULL,
ADD COLUMN     "lead_id" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."user_activity" ADD CONSTRAINT "user_activity_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
