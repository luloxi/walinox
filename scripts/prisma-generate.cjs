process.env.DATABASE_URL ||= "postgresql://u:p@127.0.0.1:5432/db?schema=public";
process.env.DATABASE_URL_UNPOOLED ||=
  "postgresql://u:p@127.0.0.1:5432/db?schema=public";

require("child_process").execSync("npx prisma generate", {
  stdio: "inherit",
  env: process.env,
});
