import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // test@naver.com 계정을 관리자로 설정
    const user = await prisma.user.findUnique({
      where: { username: "admin" },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        points: true,
      },
    });

    return NextResponse.json({
      message: "관리자 권한이 부여되었습니다.",
      user: user,
    });
  } catch (error) {
    console.error("관리자 권한 부여 에러:", error);
    return NextResponse.json(
      { error: "관리자 권한을 부여할 수 없습니다." },
      { status: 500 }
    );
  }
} 