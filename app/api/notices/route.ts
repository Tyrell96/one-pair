import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { type NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const CACHE_DURATION = 60 * 5; // 5분

interface JwtPayload {
  id: string;
  role: string;
}

// 공지사항 조회
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

    // 토큰 검증만 하고 decoded 값은 사용하지 않음
    jwt.verify(token, JWT_SECRET);

    // 공지사항 조회 (보이는 공지사항만)
    const notices = await prisma.notice.findMany({
      where: {
        isVisible: true,
      },
      select: {
        id: true,
        title: true,
        content: true,
        isImportant: true,
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

    // 캐시 헤더 설정
    const response = NextResponse.json({ notices });
    response.headers.set('Cache-Control', `private, max-age=${CACHE_DURATION}`);
    
    return response;
  } catch (error) {
    console.error("공지사항 조회 에러:", error);
    return NextResponse.json(
      { error: "공지사항을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

// 공지사항 작성 (관리자만)
export async function POST(request: NextRequest) {
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

    const { title, content, isImportant = false } = await request.json();

    // 필수 필드 검증
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "제목과 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    // 공지사항 생성
    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        isImportant,
        authorId: decoded.id,
      },
      select: {
        id: true,
        title: true,
        content: true,
        isImportant: true,
        createdAt: true,
        author: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "공지사항이 등록되었습니다.",
      notice,
    });
  } catch (error) {
    console.error("공지사항 등록 에러:", error);
    return NextResponse.json(
      { error: "공지사항을 등록할 수 없습니다." },
      { status: 500 }
    );
  }
} 