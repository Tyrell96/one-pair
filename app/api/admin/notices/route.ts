import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { type NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface JwtPayload {
  id: string;
  role: string;
}

// 모든 공지사항 조회 (관리자용)
export async function GET(request: NextRequest) {
  try {
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

    // 모든 공지사항 조회 (숨김 처리된 것도 포함)
    const notices = await prisma.notice.findMany({
      select: {
        id: true,
        title: true,
        content: true,
        isImportant: true,
        isVisible: true,
        createdAt: true,
        author: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { isImportant: 'desc' },
        { createdAt: 'desc' }
      ],
    });

    return NextResponse.json({ notices });
  } catch (error) {
    console.error("공지사항 조회 에러:", error);
    return NextResponse.json(
      { error: "공지사항을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

// 공지사항 삭제
export async function DELETE(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const noticeId = searchParams.get('id');

    if (!noticeId) {
      return NextResponse.json(
        { error: "공지사항 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 공지사항 삭제
    await prisma.notice.delete({
      where: { id: noticeId },
    });

    return NextResponse.json({
      message: "공지사항이 삭제되었습니다."
    });
  } catch (error) {
    console.error("공지사항 삭제 에러:", error);
    return NextResponse.json(
      { error: "공지사항을 삭제할 수 없습니다." },
      { status: 500 }
    );
  }
} 