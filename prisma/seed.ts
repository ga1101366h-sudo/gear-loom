import "dotenv/config";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

function getDatabaseUrl(): string {
  const env = process.env.DATABASE_URL?.trim();
  if (env) {
    if (env.startsWith("file:")) {
      const relative = env.slice(5).replace(/^\//, "");
      const absolute = path.join(process.cwd(), relative);
      return `file:${absolute}`;
    }
    return env;
  }
  return `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: getDatabaseUrl() },
  },
});

const SEED_GEARS = [
  { name: "DS-1", manufacturer: "BOSS", category: "ギターエフェクター", effectorType: "ディストーション" },
  { name: "OD-3", manufacturer: "BOSS", category: "ギターエフェクター", effectorType: "オーバードライブ" },
  { name: "SD-1", manufacturer: "BOSS", category: "ギターエフェクター", effectorType: "オーバードライブ" },
  { name: "TU-3", manufacturer: "BOSS", category: "ギターエフェクター", effectorType: "チューナー" },
  { name: "DD-8", manufacturer: "BOSS", category: "ギターエフェクター", effectorType: "ディレイ" },
  { name: "CE-2W", manufacturer: "BOSS", category: "ギターエフェクター", effectorType: "コーラス" },
  { name: "TS9", manufacturer: "Ibanez", category: "ギターエフェクター", effectorType: "オーバードライブ" },
  { name: "TS808", manufacturer: "Ibanez", category: "ギターエフェクター", effectorType: "オーバードライブ" },
  { name: "Tube Screamer", manufacturer: "Ibanez", category: "ギターエフェクター", effectorType: "オーバードライブ" },
  { name: "Big Muff", manufacturer: "Electro-Harmonix", category: "ギターエフェクター", effectorType: "ファズ" },
  { name: "Small Clone", manufacturer: "Electro-Harmonix", category: "ギターエフェクター", effectorType: "コーラス" },
  { name: "Memory Man", manufacturer: "Electro-Harmonix", category: "ギターエフェクター", effectorType: "ディレイ" },
  { name: "Bass Big Muff", manufacturer: "Electro-Harmonix", category: "ベースエフェクター", effectorType: "ファズ" },
  { name: "Julia", manufacturer: "Walrus Audio", category: "ギターエフェクター", effectorType: "コーラス" },
  { name: "Carbon Copy", manufacturer: "MXR", category: "ギターエフェクター", effectorType: "ディレイ" },
  { name: "Phase 90", manufacturer: "MXR", category: "ギターエフェクター", effectorType: "フェイザー" },
  { name: "Compressor", manufacturer: "MXR", category: "ギターエフェクター", effectorType: "コンプレッサー" },
  { name: "Klon Centaur", manufacturer: "Bill Finnegan", category: "ギターエフェクター", effectorType: "オーバードライブ" },
  { name: "RAT", manufacturer: "Pro Co", category: "ギターエフェクター", effectorType: "ディストーション" },
  { name: "Bass Driver", manufacturer: "Tech 21", category: "ベースエフェクター", effectorType: "ディストーション" },
  { name: "SansAmp", manufacturer: "Tech 21", category: "ベースエフェクター", effectorType: "プリディレイ" },
  { name: "Polytune", manufacturer: "TC Electronic", category: "ギターエフェクター", effectorType: "チューナー" },
  { name: "Flashback", manufacturer: "TC Electronic", category: "ギターエフェクター", effectorType: "ディレイ" },
  { name: "Hall of Fame", manufacturer: "TC Electronic", category: "ギターエフェクター", effectorType: "リバーブ" },
  { name: "Stratocaster", manufacturer: "Fender", category: "ギター本体", effectorType: null },
  { name: "Telecaster", manufacturer: "Fender", category: "ギター本体", effectorType: null },
  { name: "Precision Bass", manufacturer: "Fender", category: "ベース本体", effectorType: null },
  { name: "Jazz Bass", manufacturer: "Fender", category: "ベース本体", effectorType: null },
  { name: "Les Paul", manufacturer: "Gibson", category: "ギター本体", effectorType: null },
  { name: "SG", manufacturer: "Gibson", category: "ギター本体", effectorType: null },
];

async function main() {
  let created = 0;
  for (const g of SEED_GEARS) {
    const existing = await prisma.gear.findFirst({
      where: { name: g.name, manufacturer: g.manufacturer },
    });
    if (!existing) {
      await prisma.gear.create({
        data: {
          name: g.name,
          manufacturer: g.manufacturer,
          category: g.category,
          effectorType: g.effectorType,
        },
      });
      created++;
    }
  }
  console.log(`Seeded ${created} new gears (${SEED_GEARS.length} total in list).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
