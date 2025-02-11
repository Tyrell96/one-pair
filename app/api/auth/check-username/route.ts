import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { type NextRequest } from "next/server";

interface CheckUsernameRequest {
  username: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body as CheckUsernameRequest;

    // 필수 필드 검증
    if (!username?.trim()) {
      return NextResponse.json(
        { error: "아이디를 입력해주세요." },
        { status: 400 }
      );
    }

    // 아이디 형식 검증
    const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: "아이디는 4~20자의 영문, 숫자, 언더스코어만 사용 가능합니다." },
        { status: 400 }
      );
    }

    // 아이디 중복 검사 - 필요한 필드만 조회
    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });

    if (existingUser) {
      return NextResponse.json(
        { 
          error: "이미 존재하는 아이디입니다.",
          available: false 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "사용 가능한 아이디입니다.",
      available: true
    });
  } catch (error) {
    console.error("아이디 중복 확인 에러:", error);
    return NextResponse.json(
      { 
        error: "아이디 중복 확인에 실패했습니다.",
        available: false 
      },
      { status: 500 }
    );
  }
} 