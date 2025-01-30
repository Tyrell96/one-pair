import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "@/lib/auth";

export async function POST(request: Request) {
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

    const { dealerId, amount } = await request.json();

    if (!dealerId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "올바르지 않은 요청입니다." },
        { status: 400 }
      );
    }

    // 본인에게 전달하는지 확인
    if (dealerId === payload.id) {
      return NextResponse.json(
        { error: "본인에게는 포인트를 전달할 수 없습니다." },
        { status: 400 }
      );
    }

    // 트랜잭션으로 포인트 전달 처리
    const result = await prisma.$transaction(async (tx) => {
      // 딜러 확인
      const dealer = await tx.user.findUnique({
        where: {
          id: dealerId,
          isDealer: true,
        },
      });

      if (!dealer) {
        throw new Error("딜러를 찾을 수 없습니다.");
      }

      // 보내는 사용자 확인 및 포인트 차감
      const sender = await tx.user.findUnique({
        where: {
          id: payload.id,
        },
      });

      if (!sender) {
        throw new Error("사용자를 찾을 수 없습니다.");
      }

      if (sender.points < amount) {
        throw new Error("포인트가 부족합니다.");
      }

      // 포인트 차감
      await tx.user.update({
        where: {
          id: payload.id,
        },
        data: {
          points: {
            decrement: amount,
          },
        },
      });

      // 딜러에게 포인트 추가
      await tx.user.update({
        where: {
          id: dealerId,
        },
        data: {
          points: {
            increment: amount,
          },
        },
      });

      // 포인트 거래 내역 기록
      await tx.pointTransaction.create({
        data: {
          type: "전달",
          amount: amount,
          senderId: payload.id,
          receiverId: dealerId,
          description: `${sender.name}님이 ${dealer.name} 딜러에게 포인트 전달`
        },
      });

      return { success: true };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("포인트 전달 에러:", error);
    return NextResponse.json(
      { error: error.message || "포인트 전달에 실패했습니다." },
      { status: 500 }
    );
  }
} 