import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // test@naver.com 계정을 관리자로 설정
    const updatedUser = await prisma.user.update({
      where: { email: "test@naver.com" },
      data: { role: "ADMIN" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      message: "관리자 권한이 부여되었습니다.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("관리자 권한 부여 에러:", error);
    return NextResponse.json(
      { error: "관리자 권한을 부여할 수 없습니다." },
      { status: 500 }
    );
  }
} 