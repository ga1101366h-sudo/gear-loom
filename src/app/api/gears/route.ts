import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type GearCreateBody = {
  name: string;
  manufacturer?: string | null;
  category?: string;
  effectorType?: string | null;
  imageUrl?: string | null;
  defaultIcon?: string | null;
  authorId?: string | null;
};

export async function GET() {
  try {
    const gears = await prisma.gear.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(gears);
  } catch (error) {
    console.error("🗄️ Database Error:", error);
    return NextResponse.json(
      { error: "機材一覧の取得に失敗しました" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GearCreateBody;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "機材名（name）は必須です" },
        { status: 400 },
      );
    }
    const category =
      typeof body.category === "string" && body.category.trim()
        ? body.category.trim()
        : "ギターエフェクター";
    const gear = await prisma.gear.create({
      data: {
        name,
        manufacturer:
          typeof body.manufacturer === "string" ? body.manufacturer.trim() || null : null,
        category,
        effectorType:
          typeof body.effectorType === "string" ? body.effectorType.trim() || null : null,
        imageUrl:
          typeof body.imageUrl === "string" ? body.imageUrl.trim() || null : null,
        defaultIcon:
          typeof body.defaultIcon === "string" ? body.defaultIcon.trim() || null : null,
        authorId:
          typeof body.authorId === "string" ? body.authorId.trim() || null : null,
      },
    });
    return NextResponse.json(gear);
  } catch (error) {
    console.error("🗄️ Database Error:", error);
    return NextResponse.json(
      { error: "機材の登録に失敗しました" },
      { status: 500 },
    );
  }
}
