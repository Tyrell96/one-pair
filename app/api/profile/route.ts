import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface ProfileUpdateRequest {
  id: string;
  nickname?: string;
  bankAccount?: string;
  currentPassword?: string;
  newPassword?: string;
}

interface JwtPayload {
  id: string;
  role: string;
}

export async function PUT(request: NextRequest) {
  try {
    // 토큰 검증
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const body = await request.json();
    const { id, nickname, bankAccount, currentPassword, newPassword } = body as ProfileUpdateRequest;

    // 토큰의 사용자 ID와 요청의 ID가 일치하는지 확인
    if (decoded.id !== id) {
      return NextResponse.json(
        { error: "잘못된 접근입니다." },
        { status: 403 }
      );
    }

    // 현재 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        password: true,
        nickname: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 닉네임 중복 확인
    if (nickname && nickname !== user.nickname) {
      const existingNickname = await prisma.user.findUnique({
        where: { nickname },
        select: { id: true }
      });

      if (existingNickname) {
        return NextResponse.json(
          { error: "이미 사용 중인 닉네임입니다." },
          { status: 400 }
        );
      }
    }

    // 업데이트할 데이터 준비
    const updateData: {
      nickname?: string;
      bankAccount?: string;
      password?: string;
    } = {};
    
    if (nickname) updateData.nickname = nickname;
    if (bankAccount) updateData.bankAccount = bankAccount;

    // 비밀번호 변경 처리
    if (currentPassword && newPassword) {
      // 비밀번호 형식 검증
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return NextResponse.json(
          { error: "새 비밀번호는 8자 이상의 영문과 숫자 조합이어야 합니다." },
          { status: 400 }
        );
      }

      // 현재 비밀번호 확인
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "현재 비밀번호가 일치하지 않습니다." },
          { status: 400 }
        );
      }

      // 새 비밀번호 해싱
      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    // 사용자 정보 업데이트
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        nickname: true,
        role: true,
        points: true,
        bankAccount: true,
        avatar: true,
      },
    });

    return NextResponse.json({
      message: "프로필이 성공적으로 업데이트되었습니다.",
      user: updatedUser
    });
  } catch (error) {
    console.error("프로필 업데이트 에러:", error);
    return NextResponse.json(
      { error: "프로필을 업데이트할 수 없습니다." },
      { status: 500 }
    );
  }
} 