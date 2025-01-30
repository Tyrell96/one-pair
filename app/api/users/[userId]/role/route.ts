import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const { role } = await request.json();

    // 권한 값 검증
    if (role !== "ADMIN" && role !== "USER") {
      return NextResponse.json(
        { error: "잘못된 권한 값입니다." },
        { status: 400 }
      );
    }

    // 사용자 권한 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
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