-- AddForeignKey
ALTER TABLE "public"."leads" ADD CONSTRAINT "leads_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
