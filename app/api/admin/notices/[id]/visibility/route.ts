import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { type NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface JwtPayload {
  id: string;
  role: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    
    // 토큰 검증
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // 관리자 권한 확인
    if (decoded.role !== "ADMIN") {
      return NextResponse.json(
        { error: "관리자만 접근할 수 있습니다." },
        { status: 403 }
      );
    }

    const { isVisible } = await request.json();

    // 공지사항 상태 업데이트
    const notice = await prisma.notice.update({
      where: { id: params.id },
      data: { isVisible },
      select: {
        id: true,
        title: true,
        isVisible: true,
      },
    });

    return NextResponse.json({
      message: `공지사항이 ${isVisible ? '표시' : '숨김'} 처리되었습니다.`,
      notice,
    });
  } catch (error) {
    console.error("공지사항 상태 변경 에러:", error);
    return NextResponse.json(
      { error: "공지사항 상태를 변경할 수 없습니다." },
      { status: 500 }
    );
  }
} 