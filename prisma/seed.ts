import { existsSync, readFileSync } from "fs";

function loadLocalEnv() {
  if (!existsSync(".env")) return;
  const lines = readFileSync(".env", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1]?.trim();
    const rawValue = match[2]?.trim() ?? "";
    if (!key || process.env[key]) continue;
    process.env[key] = rawValue.replace(/^"|"$/g, "");
  }
}

loadLocalEnv();

const { hash } = require("bcryptjs");
const { prisma } = require("../lib/prisma");

async function main() {
  const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD;
  const firstName = process.env.BOOTSTRAP_SUPER_ADMIN_FIRST_NAME?.trim() || "VCGL";
  const lastName = process.env.BOOTSTRAP_SUPER_ADMIN_LAST_NAME?.trim() || "Administrator";

  if (!email || !email.includes("@")) {
    throw new Error("Set BOOTSTRAP_SUPER_ADMIN_EMAIL to a valid company email before running the bootstrap seed.");
  }
  if (!password || password.length < 12) {
    throw new Error("Set BOOTSTRAP_SUPER_ADMIN_PASSWORD to a secure value with at least 12 characters.");
  }

  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true, email: true }
  });
  if (existingSuperAdmin) {
    if (existingSuperAdmin.email !== email) {
      throw new Error(`A Super Admin already exists as ${existingSuperAdmin.email}. Bootstrap will not create a second one.`);
    }
    console.log(`Super Admin ${email} already exists. No changes made.`);
    return;
  }

  const emailOwner = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (emailOwner) throw new Error("The bootstrap email already belongs to another account.");

  const passwordHash = await hash(password, 12);
  const administrator = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      employmentStatus: "ACTIVE",
      jobTitle: "System Administrator",
      dateJoined: new Date()
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: administrator.id,
      action: "SUPER_ADMIN_BOOTSTRAPPED",
      entityType: "User",
      entityId: administrator.id,
      metadata: { email: administrator.email }
    }
  });
  console.log(`Super Admin ${email} created successfully.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
