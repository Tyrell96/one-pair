import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const { role } = await req.json();

    // 권한 값 검증
    if (role !== "ADMIN" && role !== "USER") {
      return NextResponse.json(
        { error: "잘못된 권한 값입니다." },
        { status: 400 }
      );
    }

    // 사용자 권한 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: { role },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        points: true,
      },
    });

    return NextResponse.json({
      message: `사용자의 권한이 ${role}로 변경되었습니다.`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("권한 변경 에러:", error);
    return NextResponse.json(
      { error: "권한을 변경할 수 없습니다." },
      { status: 500 }
    );
  }
} 