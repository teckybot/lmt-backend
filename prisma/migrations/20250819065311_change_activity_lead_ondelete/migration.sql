-- DropForeignKey
ALTER TABLE "public"."user_activity" DROP CONSTRAINT "user_activity_lead_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."user_activity" ADD CONSTRAINT "user_activity_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
