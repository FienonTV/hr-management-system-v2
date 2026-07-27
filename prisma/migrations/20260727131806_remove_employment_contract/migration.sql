/*
  Warnings:

  - You are about to drop the `employment_contracts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "employment_contracts" DROP CONSTRAINT "employment_contracts_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "employment_contracts" DROP CONSTRAINT "employment_contracts_tenant_id_fkey";

-- DropTable
DROP TABLE "employment_contracts";

-- DropEnum
DROP TYPE "contract_type";
