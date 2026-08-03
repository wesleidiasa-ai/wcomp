-- DropIndex
DROP INDEX "whatsapp_sessions_phone_key";

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "whatsapp_phone_number_id" TEXT;

-- AlterTable
ALTER TABLE "whatsapp_sessions" ADD COLUMN     "company_id" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "companies_whatsapp_phone_number_id_key" ON "companies"("whatsapp_phone_number_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_sessions_company_id_phone_key" ON "whatsapp_sessions"("company_id", "phone");

-- AddForeignKey
ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

