import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: {
    requestId: string;
  };
};

export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { requestId } = params;
    const { status } = await req.json();

    // 요청 정보 조회
    const pointRequest = await prisma.pointRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!pointRequest) {
      return NextResponse.json(
        { error: "요청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이미 처리된 요청인지 확인
    if (pointRequest.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 요청입니다." },
        { status: 400 }
      );
    }

    // 출금 요청인 경우 잔액 확인
    if (status === "approved" && pointRequest.type === "withdraw") {
      if (pointRequest.user.points < pointRequest.amount) {
        return NextResponse.json(
          { error: "잔액이 부족합니다." },
          { status: 400 }
        );
      }
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. 요청 상태 업데이트
        await tx.pointRequest.update({
          where: { id: requestId },
          data: { status },
        });

        if (status === "approved") {
          // 관리자 계정 조회 (ADMIN 권한을 가진 첫 번째 사용자)
          const admin = await tx.user.findFirst({
            where: { role: "ADMIN" },
            select: { id: true, name: true }
          });

          if (!admin) {
            throw new Error("관리자를 찾을 수 없습니다.");
          }

          // 2. 사용자 포인트 업데이트
          const pointChange = pointRequest.type === "charge" 
            ? pointRequest.amount 
            : -pointRequest.amount;

          const updatedUser = await tx.user.update({
            where: { id: pointRequest.userId },
            data: {
              points: {
                increment: pointChange,
              },
            },
            select: {
              id: true,
              name: true,
              email: true,
              points: true,
              role: true,
              avatar: true,
            },
          });

          // 3. 포인트 트랜잭션 기록 생성
          await tx.pointTransaction.create({
            data: {
              type: pointRequest.type === 'charge' ? '충전' : '출금',
              amount: pointRequest.amount,
              senderId: pointRequest.type === 'charge' ? admin.id : pointRequest.userId,
              receiverId: pointRequest.type === 'charge' ? pointRequest.userId : admin.id,
              description: pointRequest.type === 'charge' 
                ? `${pointRequest.user.name}님 포인트 충전 (${pointRequest.amount.toLocaleString()}P)` 
                : `${pointRequest.user.name}님 포인트 출금 (${pointRequest.amount.toLocaleString()}P)`
            },
          });

          return {
            success: true,
            message: `${pointRequest.type === "charge" ? "충전" : "출금"}이 완료되었습니다. (현재 포인트: ${updatedUser.points.toLocaleString()}P)`,
            user: updatedUser,
          };
        }

        return {
          success: true,
          message: "요청이 거절되었습니다.",
        };
      });

      return NextResponse.json(result);
    } catch (error) {
      console.error("트랜잭션 에러:", error);
      throw new Error("포인트 처리 중 오류가 발생했습니다.");
    }
  } catch (error) {
    console.error("포인트 요청 처리 에러:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "요청을 처리할 수 없습니다." },
      { status: 500 }
    );
  }
} 