import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "인증 토큰이 없습니다." },
        { status: 401 }
      );
    }

    const payload = getToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "유효하지 않은 토큰입니다." },
        { status: 401 }
      );
    }

    // 딜러로 지정된 사용자만 조회
    const dealers = await prisma.user.findMany({
      where: {
        isDealer: true,
      },
      select: {
        id: true,
        name: true,
        isDealer: true,
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({ dealers });
  } catch (error) {
    console.error("딜러 목록 조회 에러:", error);
    return NextResponse.json(
      { error: "딜러 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
} 