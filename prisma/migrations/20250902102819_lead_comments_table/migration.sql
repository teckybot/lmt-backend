-- CreateTable
CREATE TABLE "public"."lead_comments" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_comments_leadId_idx" ON "public"."lead_comments"("leadId");

-- AddForeignKey
ALTER TABLE "public"."lead_comments" ADD CONSTRAINT "lead_comments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lead_comments" ADD CONSTRAINT "lead_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
