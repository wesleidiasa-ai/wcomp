import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("senha123", 10);

  const company = await prisma.company.create({
    data: { name: "Fazenda Modelo Ltda", cnpj: "00.000.000/0001-00", plan: "pro" },
  });

  const department = await prisma.department.create({
    data: { companyId: company.id, name: "Agrícola" },
  });

  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      name: "Ana Admin",
      email: "admin@fazendamodelo.com",
      role: "admin",
      passwordHash,
    },
  });

  const aprovador = await prisma.user.create({
    data: {
      companyId: company.id,
      departmentId: department.id,
      name: "Bruno Aprovador",
      email: "bruno@fazendamodelo.com",
      role: "aprovador",
      passwordHash,
    },
  });

  const comprador = await prisma.user.create({
    data: {
      companyId: company.id,
      name: "Carla Compradora",
      email: "carla@fazendamodelo.com",
      role: "comprador",
      passwordHash,
    },
  });

  const solicitante = await prisma.user.create({
    data: {
      companyId: company.id,
      departmentId: department.id,
      name: "Diego Solicitante",
      email: "diego@fazendamodelo.com",
      role: "solicitante",
      passwordHash,
    },
  });

  await prisma.approvalRule.create({
    data: {
      companyId: company.id,
      departmentId: department.id,
      minValue: 0,
      maxValue: null,
      stepOrder: 1,
      approverId: aprovador.id,
    },
  });

  console.log("Seed concluído. Senha para todos os usuários: senha123");
  console.log({ admin: admin.email, aprovador: aprovador.email, comprador: comprador.email, solicitante: solicitante.email });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
