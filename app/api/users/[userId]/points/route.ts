import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const { action, amount } = await request.json();

    // 사용자 확인
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        points: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 관리자 계정 조회
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true, name: true }
    });

    if (!admin) {
      return NextResponse.json(
        { error: "관리자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 차감 시 잔액 확인
    if (action === "subtract" && user.points < amount) {
      return NextResponse.json(
        { error: "사용자의 포인트가 부족합니다." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 포인트 업데이트
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          points: {
            [action === "add" ? "increment" : "decrement"]: amount,
          },
        },
      });

      // 포인트 거래 내역 생성
      await tx.pointTransaction.create({
        data: {
          type: action === "add" ? "충전" : "차감",
          amount: amount,
          senderId: action === "add" ? admin.id : userId,
          receiverId: action === "add" ? userId : admin.id,
          description: action === "add" 
            ? `관리자가 ${user.name}님의 포인트를 충전 (${amount.toLocaleString()}P)`
            : `관리자가 ${user.name}님의 포인트를 차감 (${amount.toLocaleString()}P)`,
        },
      });

      return updatedUser;
    });

    return NextResponse.json({
      message: `포인트가 성공적으로 ${action === "add" ? "충전" : "차감"}되었습니다.`,
      user: result,
    });
  } catch (error) {
    console.error("포인트 관리 에러:", error);
    return NextResponse.json(
      { error: "포인트 관리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 