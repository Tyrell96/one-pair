import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, email, currentPassword, newPassword } = body;

    // 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 비밀번호 변경이 요청된 경우
    if (currentPassword && newPassword) {
      // 현재 비밀번호 확인
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "현재 비밀번호가 일치하지 않습니다." },
          { status: 400 }
        );
      }

      // 새 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // 프로필 업데이트 (비밀번호 포함)
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          name,
          email,
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          points: true,
          role: true,
          avatar: true,
        }
      });

      return NextResponse.json(updatedUser);
    }

    // 비밀번호 변경 없이 프로필만 업데이트
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        points: true,
        role: true,
        avatar: true,
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("프로필 업데이트 에러:", error);
    return NextResponse.json(
      { error: "프로필 업데이트에 실패했습니다." },
      { status: 500 }
    );
  }
} 