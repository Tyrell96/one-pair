"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Home } from "lucide-react";

interface Table {
  id: string;
  name: string;
  color: string;
  number: number;
  seats: number;
}

interface Player {
  id: string;
  name: string;
}

interface Assignment {
  tableName: string;
  seatNumber: number;
  playerName: string;
}

export default function SeatAssignmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tables, setTables] = useState<Table[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // players나 tables가 변경될 때마다 자리 배정 실행
  useEffect(() => {
    if (players.length > 0 && tables.length > 0) {
      assignSeats(tables);
    }
  }, [players, tables]);

  const loadData = async () => {
    try {
      setLoading(true);
      // 세션 스토리지에서 플레이어 목록 가져오기
      const storedPlayers = sessionStorage.getItem("gamePlayers");
      if (!storedPlayers) {
        toast({
          title: "오류",
          description: "플레이어 목록이 없습니다. 메인 페이지로 이동합니다.",
          variant: "destructive",
        });
        router.push("/");
        return;
      }

      const parsedPlayers = JSON.parse(storedPlayers);
      setPlayers(parsedPlayers);

      // 테이블 정보 가져오기
      const response = await fetch("/api/tables");
      if (!response.ok) throw new Error("테이블 정보를 불러올 수 없습니다.");
      const data = await response.json();
      
      if (!data.tables || data.tables.length === 0) {
        toast({
          title: "오류",
          description: "설정된 테이블이 없습니다. 테이블 설정 페이지로 이동합니다.",
          variant: "destructive",
        });
        router.push("/table-setup");
        return;
      }

      setTables(data.tables);
    } catch (error) {
      console.error("데이터 로딩 에러:", error);
      toast({
        title: "오류",
        description: "데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await fetch("/api/tables");
      if (!response.ok) throw new Error("테이블 정보를 불러올 수 없습니다.");
      const data = await response.json();
      console.log("가져온 테이블 데이터:", data);
      
      if (!data.tables || data.tables.length === 0) {
        toast({
          title: "오류",
          description: "설정된 테이블이 없습니다. 테이블 설정 페이지로 이동합니다.",
          variant: "destructive",
        });
        router.push("/table-setup");
        return;
      }

      setTables(data.tables);
    } catch (error) {
      console.error("테이블 정보 로딩 에러:", error);
      toast({
        title: "오류",
        description: "테이블 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const assignSeats = (tables: Table[]) => {
    if (!players.length) {
      console.log("플레이어가 없어 자리 배정을 건너뜁니다.");
      return;
    }

    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    console.log("섞인 플레이어:", shuffledPlayers);
    
    let currentPlayerIndex = 0;
    const newAssignments: Assignment[] = [];

    // 각 테이블별로 좌석 배정
    tables.forEach(table => {
      console.log(`${table.name} 테이블 좌석 배정 시작:`, { seats: table.seats });
      for (let seatNumber = 1; seatNumber <= table.seats; seatNumber++) {
        if (currentPlayerIndex < shuffledPlayers.length) {
          newAssignments.push({
            tableName: table.name,
            seatNumber,
            playerName: shuffledPlayers[currentPlayerIndex].name,
          });
          currentPlayerIndex++;
        }
      }
    });

    console.log("최종 자리 배정 결과:", newAssignments);
    setAssignments(newAssignments);
  };

  const resetAssignments = () => {
    const shouldReset = window.confirm("자리 배정을 초기화하시겠습니까?");
    if (shouldReset) {
      assignSeats(tables); // 기존 테이블로 재배정
      toast({
        title: "초기화 완료",
        description: "자리 배정이 초기화되었습니다.",
      });
    }
  };

  // 테이블별로 배정 결과 그룹화
  const assignmentsByTable = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.tableName]) {
      acc[assignment.tableName] = [];
    }
    acc[assignment.tableName].push(assignment);
    return acc;
  }, {} as Record<string, Assignment[]>);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              데이터를 불러오는 중...
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6 p-4 sm:p-0 border-b sm:border-0">
        <h1 className="text-xl sm:text-2xl font-bold">좌석 배정</h1>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="flex items-center space-x-2"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">메인으로</span>
          </Button>
        </div>
      </div>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>배정 결과</CardTitle>
            {assignments.length > 0 && (
              <Button
                variant="outline"
                onClick={resetAssignments}
              >
                자리 배정 초기화
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className="text-center p-4">
                배정된 자리가 없습니다.
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(assignmentsByTable).map(([tableName, tableAssignments]) => (
                  <div key={tableName}>
                    <h3 className="font-semibold text-lg mb-2">{tableName} 테이블</h3>
                    <div className="space-y-2">
                      {tableAssignments
                        .sort((a, b) => a.seatNumber - b.seatNumber)
                        .map((assignment, index) => (
                          <div key={index} className="p-2 bg-gray-100 rounded">
                            {`${assignment.seatNumber}번 좌석: ${assignment.playerName}`}
                          </div>
                      ))}
                    </div>
                    {tableName !== Object.keys(assignmentsByTable).slice(-1)[0] && (
                      <Separator className="my-4" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 