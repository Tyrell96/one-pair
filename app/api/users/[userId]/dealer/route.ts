import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const { isDealer } = await request.json();

    // 사용자 딜러 상태 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isDealer },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        points: true,
        isDealer: true,
      },
    });

    return NextResponse.json({
      message: `사용자의 딜러 상태가 ${isDealer ? '딜러' : '일반'}로 변경되었습니다.`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("딜러 상태 변경 에러:", error);
    return NextResponse.json(
      { error: "딜러 상태를 변경할 수 없습니다." },
      { status: 500 }
    );
  }
} 