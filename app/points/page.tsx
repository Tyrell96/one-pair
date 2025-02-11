"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ArrowDown, ArrowUp, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { BottomNav } from "@/components/navigation/bottom-nav";

interface User {
  id: string;
  username: string;
  name: string;
  nickname: string;
  points: number;
  role: string;
  isDealer: boolean;
  avatar?: string;
}

interface PointRequest {
  id: string;
  type: 'charge' | 'withdraw';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
}

export default function PointsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isPointRequestOpen, setIsPointRequestOpen] = useState(false);
  const [isShoppingOpen, setIsShoppingOpen] = useState(false);
  const [pointRequestAmount, setPointRequestAmount] = useState("");
  const [pointRequestType, setPointRequestType] = useState<'charge' | 'withdraw'>('charge');
  const [isLoading, setIsLoading] = useState(true);
  const [pointRequests, setPointRequests] = useState<PointRequest[]>([]);

  const fetchPointRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/point-requests/my-requests", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("포인트 요청 내역을 불러올 수 없습니다.");

      const data = await response.json();
      setPointRequests(data);
    } catch {
      toast({
        variant: "destructive",
        title: "에러",
        description: "포인트 요청 내역을 불러오는데 실패했습니다.",
      });
    }
  }, [toast]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setIsLoading(false);
          router.replace("/sign-in");
          return;
        }

        const response = await fetch("/api/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("token");
            setIsLoading(false);
            router.replace("/sign-in");
            return;
          }
          throw new Error("사용자 정보를 불러올 수 없습니다.");
        }

        const userData = await response.json();
        setUser(userData);
        await fetchPointRequests();
      } catch {
        toast({
          variant: "destructive",
          title: "에러",
          description: "사용자 정보를 불러오는데 실패했습니다.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, [router, toast, fetchPointRequests]);

  const handlePointRequest = async () => {
    if (!pointRequestAmount || isNaN(Number(pointRequestAmount))) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "올바른 금액을 입력해주세요.",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/point-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: pointRequestType,
          amount: Number(pointRequestAmount),
          userId: user?.id,
        }),
      });

      if (!response.ok) throw new Error("포인트 요청 처리 중 오류가 발생했습니다.");

      toast({
        title: "요청 완료",
        description: "포인트 요청이 정상적으로 처리되었습니다.",
      });

      // 요청 성공 후 내역 새로고침
      await fetchPointRequests();
      
      // 사용자 정보 새로고침 (포인트 잔액 업데이트를 위해)
      const userResponse = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      }

      setIsPointRequestOpen(false);
      setPointRequestAmount("");
    } catch {
      toast({
        title: "오류",
        description: "포인트 요청을 생성하는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !user) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 space-y-4 pb-20">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>포인트 관리</CardTitle>
            <Button
              variant="outline"
              onClick={() => setIsShoppingOpen(true)}
              className="flex items-center space-x-2"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">상품 구매</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-4">
            {user?.points.toLocaleString()} P
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Sheet open={isPointRequestOpen} onOpenChange={setIsPointRequestOpen}>
              <SheetTrigger asChild>
                <Button
                  className="w-full"
                  onClick={() => {
                    setPointRequestType('charge');
                    setIsPointRequestOpen(true);
                  }}
                >
                  <ArrowUp className="mr-2 h-4 w-4" />
                  충전하기
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>
                    {pointRequestType === 'charge' ? '포인트 충전' : '포인트 출금'}
                  </SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>금액</Label>
                    <Input
                      type="number"
                      placeholder="금액을 입력하세요"
                      value={pointRequestAmount}
                      onChange={(e) => setPointRequestAmount(e.target.value)}
                    />
                  </div>
                  <Button onClick={handlePointRequest} className="w-full">
                    요청하기
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={isPointRequestOpen} onOpenChange={setIsPointRequestOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setPointRequestType('withdraw');
                    setIsPointRequestOpen(true);
                  }}
                >
                  <ArrowDown className="mr-2 h-4 w-4" />
                  출금하기
                </Button>
              </SheetTrigger>
            </Sheet>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>요청 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pointRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                포인트 요청 내역이 없습니다.
              </div>
            ) : (
              pointRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex justify-between items-center p-4 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">
                      {request.type === 'charge' ? '충전' : '출금'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(request.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className={`font-bold ${
                      request.type === 'charge' ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {request.type === 'charge' ? '+' : '-'}
                      {request.amount.toLocaleString()} P
                    </div>
                    <div className="text-sm text-gray-500 text-right">
                      {request.status === 'pending' ? '대기중' :
                       request.status === 'approved' ? '승인됨' : '거절됨'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 상품 구매 드로어 */}
      <Sheet open={isShoppingOpen} onOpenChange={setIsShoppingOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>상품 구매</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <div className="font-medium">라면</div>
                  <div className="text-sm text-muted-foreground">3,500 P</div>
                </div>
                <Button size="sm">구매하기</Button>
              </div>
              <div className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <div className="font-medium">음료</div>
                  <div className="text-sm text-muted-foreground">2,000 P</div>
                </div>
                <Button size="sm">구매하기</Button>
              </div>
              <div className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <div className="font-medium">모바일 지폴</div>
                  <div className="text-sm text-muted-foreground">12,000 P</div>
                </div>
                <Button size="sm">구매하기</Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
} 