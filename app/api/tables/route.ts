import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tables = await prisma.pokerTable.findMany({
      orderBy: [
        { color: "asc" },
        { number: "asc" },
      ],
      include: {
        seatAssignments: true,
      },
    });

    return NextResponse.json({ tables });
  } catch (error) {
    console.error("테이블 조회 에러:", error);
    return NextResponse.json(
      { error: "테이블 정보를 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
} 