import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerName } = body;

    if (!playerName) {
      return NextResponse.json(
        { error: "플레이어 이름이 필요합니다." },
        { status: 400 }
      );
    }

    // 모든 테이블과 배정된 좌석 정보 가져오기
    const tables = await prisma.pokerTable.findMany({
      include: {
        seatAssignments: true,
      },
    });

    if (!tables || tables.length === 0) {
      return NextResponse.json(
        { error: "설정된 테이블이 없습니다." },
        { status: 400 }
      );
    }

    // 사용 가능한 테이블과 좌석 찾기
    const availableSeats = tables.flatMap(table => {
      const assignedSeats = new Set(table.seatAssignments.map(a => a.seatNumber));
      const availableSeatsForTable = Array.from(
        { length: table.seats },
        (_, i) => i + 1
      ).filter(seatNumber => !assignedSeats.has(seatNumber));

      return availableSeatsForTable.map(seatNumber => ({
        tableId: table.id,
        tableName: table.name,
        seatNumber,
      }));
    });

    if (availableSeats.length === 0) {
      return NextResponse.json(
        { error: "사용 가능한 좌석이 없습니다." },
        { status: 400 }
      );
    }

    // 랜덤하게 좌석 선택
    const randomIndex = Math.floor(Math.random() * availableSeats.length);
    const selectedSeat = availableSeats[randomIndex];

    // 좌석 배정
    const assignment = await prisma.seatAssignment.create({
      data: {
        tableId: selectedSeat.tableId,
        seatNumber: selectedSeat.seatNumber,
        playerName: playerName,
      },
    });

    return NextResponse.json({
      tableName: selectedSeat.tableName,
      seatNumber: selectedSeat.seatNumber,
    });
  } catch (error) {
    console.error("자리 배정 에러:", error);
    return NextResponse.json(
      { error: "자리 배정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 