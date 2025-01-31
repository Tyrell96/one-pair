import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

interface RouteContext {
  params: Promise<{
    userId: string;
  }>;
}

// 사용자 삭제
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const { userId } = params;

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      message: "사용자가 삭제되었습니다.",
    });
  } catch (error) {
    console.error("사용자 삭제 에러:", error);
    return NextResponse.json(
      { error: "사용자를 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
}

// 비밀번호 초기화
export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const { userId } = params;
    const { action } = await req.json();

    if (action === "resetPassword") {
      // 임시 비밀번호 생성 (예: "User@" + 랜덤 6자리 숫자)
      const tempPassword = `User@${Math.floor(100000 + Math.random() * 900000)}`;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return NextResponse.json({
        message: "비밀번호가 초기화되었습니다.",
        tempPassword,
      });
    }

    return NextResponse.json(
      { error: "잘못된 요청입니다." },
      { status: 400 }
    );
  } catch (error) {
    console.error("비밀번호 초기화 에러:", error);
    return NextResponse.json(
      { error: "비밀번호를 초기화할 수 없습니다." },
      { status: 500 }
    );
  }
} 