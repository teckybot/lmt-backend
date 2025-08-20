-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('INFO', 'REASSIGN_REQUEST', 'REASSIGN_DECISION');

-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."notifications" ADD COLUMN     "actedById" INTEGER,
ADD COLUMN     "requestedById" INTEGER,
ADD COLUMN     "status" "public"."RequestStatus",
ADD COLUMN     "type" "public"."NotificationType" NOT NULL DEFAULT 'INFO';

-- CreateTable
CREATE TABLE "public"."reassign_permissions" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "grantedBy" INTEGER NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reassign_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reassign_permissions_leadId_adminId_used_idx" ON "public"."reassign_permissions"("leadId", "adminId", "used");

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_actedById_fkey" FOREIGN KEY ("actedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reassign_permissions" ADD CONSTRAINT "reassign_permissions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reassign_permissions" ADD CONSTRAINT "reassign_permissions_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
