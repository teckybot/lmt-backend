-- AlterTable
ALTER TABLE "public"."lead_comments" ADD COLUMN     "replyToId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."lead_comments" ADD CONSTRAINT "lead_comments_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "public"."lead_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
