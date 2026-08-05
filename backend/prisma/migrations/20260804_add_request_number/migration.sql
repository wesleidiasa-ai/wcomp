-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "request_counter" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "purchase_requests" ADD COLUMN     "request_number" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requests_company_id_request_number_key" ON "purchase_requests"("company_id", "request_number");

