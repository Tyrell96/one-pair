/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, History, TrendingUp, LogOut, User, Wallet, DollarSign, Trash2, RefreshCw, Home, MoreHorizontal, Bell, CreditCard, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import jwt from "jsonwebtoken";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  sender?: {
    name: string;
    username: string;
  };
  receiver?: {
    name: string;
    username: string;
  };
}

interface Player {
  id: string;
  name: string;
  points: number;
  createdAt?: string;
}

interface PointHistory {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
}

interface DailyPointData {
  date: string;
  points: number;
}

interface HourlyPointData {
  hour: string;
  points: number;
}

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
  type: 'charge' | 'withdraw';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
}

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [savedPlayers, setSavedPlayers] = useState<Player[]>([]);
  const [pointHistory, setPointHistory] = useState<Transaction[]>([]);
  const [currentPoints, setCurrentPoints] = useState(1000);
  const [isPointRequestOpen, setIsPointRequestOpen] = useState(false);
  const [pointRequestAmount, setPointRequestAmount] = useState("");
  const [pointRequestType, setPointRequestType] = useState<'charge' | 'withdraw'>('charge');
  const [isLoading, setIsLoading] = useState(true);
  const [dailyPointData, setDailyPointData] = useState<DailyPointData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [isUsePointOpen, setIsUsePointOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [usePointAmount, setUsePointAmount] = useState("");

  const processPointHistory = useCallback((transactions: Transaction[]) => {
    const dailyMap = new Map<string, number>();
    const currentPoints = user?.points || 0;
    const today = new Date().toISOString().split('T')[0];

    // 최근 7일 동안의 날짜 배열 생성
    const last7Days = Array.from({length: 7}, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    let runningTotal = currentPoints;
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    dailyMap.set(today, currentPoints);

    last7Days.reverse().forEach(dateKey => {
      if (dateKey === today) return;

      const dayTransactions = sortedTransactions.filter(tx => 
        new Date(tx.date).toISOString().split('T')[0] === dateKey
      );

      dayTransactions.forEach(tx => {
        if (tx.type === "충전" || tx.type === "받기") {
          runningTotal -= tx.amount;
        } else if (tx.type === "출금" || tx.type === "사용" || tx.type === "전달") {
          runningTotal += tx.amount;
        }
      });

      dailyMap.set(dateKey, runningTotal);
    });

    setDailyPointData(
      last7Days.reverse().map(date => ({
        date,
        points: Math.max(0, dailyMap.get(date) || 0),
      }))
    );
  }, [user?.points]);

  const fetchUserInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        router.replace("/sign-in");
        return;
      }

      // 캐시된 사용자 정보 확인 및 사용
      const cachedUser = localStorage.getItem("user");
      if (cachedUser) {
        const userData = JSON.parse(cachedUser);
        setUser(userData);
        setIsLoading(false);
      }

      // 백그라운드에서 최신 데이터 가져오기
      const response = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setIsLoading(false);
          router.replace("/sign-in");
          return;
        }
        throw new Error("사용자 정보를 불러올 수 없습니다.");
      }

      const userData = await response.json();
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (error) {
      console.error("사용자 정보 로딩 에러:", error);
      // 캐시된 데이터가 없는 경우에만 로그인 페이지로 이동
      if (!localStorage.getItem("user")) {
        localStorage.removeItem("token");
        setIsLoading(false);
        router.replace("/sign-in");
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const fetchPointHistory = useCallback(async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      // 캐시된 포인트 내역 확인
      const cachedHistory = localStorage.getItem(`pointHistory_${userId}`);
      if (cachedHistory) {
        const data = JSON.parse(cachedHistory);
        setPointHistory(data.transactions);
        processPointHistory(data.transactions);
      }

      // 백그라운드에서 최신 데이터 가져오기
      const response = await fetch(`/api/transactions?userId=${userId}&limit=7`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('포인트 내역을 불러올 수 없습니다.');
      const data = await response.json();
      setPointHistory(data.transactions);
      processPointHistory(data.transactions);
      // 캐시 업데이트
      localStorage.setItem(`pointHistory_${userId}`, JSON.stringify(data));
    } catch (error) {
      console.error("포인트 내역 로딩 에러:", error);
    }
  }, [processPointHistory]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  useEffect(() => {
    if (user?.id) {
      fetchPointHistory(user.id);
    }
  }, [user?.id, fetchPointHistory]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push('/sign-in');
  }, [router]);

  const handleUsePoints = async () => {
    if (!selectedProduct || !selectedAmount) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "상품을 선택해주세요.",
      });
      return;
    }

    const amount = selectedAmount;
    if (amount > (user?.points || 0)) {
      toast({
        variant: "destructive",
        title: "잔액 부족",
        description: "보유 포인트가 부족합니다.",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/points/use", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          product: selectedProduct,
          userId: user?.id,
        }),
      });

      if (!response.ok) throw new Error("포인트 사용 중 오류가 발생했습니다.");

      const userData = await response.json();
      setUser(userData);

      toast({
        title: "성공",
        description: `${selectedProduct} 구매가 완료되었습니다.`,
      });

      setIsUsePointOpen(false);
      setSelectedProduct(null);
      setSelectedAmount(0);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "에러",
        description: "포인트 사용 중 오류가 발생했습니다.",
      });
    }
  };

  if (isLoading || !user) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* 상단부: 닉네임과 포인트 */}
      <div className="bg-white p-6 shadow-sm">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-lg font-medium">{user.nickname}</span>
            </div>
            <button onClick={handleLogout} className="text-gray-500">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold">{user.points.toLocaleString()} P</div>
          </div>
        </div>
      </div>

      {/* 중앙: 포인트 변동 그래프 */}
      <div className="flex-1 container mx-auto p-4">
        <Card className="h-[300px] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={dailyPointData}
              margin={{ top: 5, right: 20, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis 
                tickFormatter={(value) => `${value.toLocaleString()}P`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toLocaleString()}P`, '포인트']}
              />
              <Line 
                type="monotone" 
                dataKey="points" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* 하단: 네비게이션 버튼 */}
      <div className="bg-white border-t">
        <div className="container mx-auto grid grid-cols-5 gap-1 p-2">
          <Button
            variant="ghost"
            className="flex flex-col items-center py-3"
            onClick={() => router.push('/')}
          >
            <Home className="h-6 w-6 mb-1" />
            <span className="text-xs">홈</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center py-3"
            onClick={() => router.push('/transactions')}
          >
            <History className="h-6 w-6 mb-1" />
            <span className="text-xs">내역</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center py-3"
            onClick={() => router.push('/points')}
          >
            <TrendingUp className="h-6 w-6 mb-1" />
            <span className="text-xs">포인트</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center py-3"
            onClick={() => router.push('/profile')}
          >
            <User className="h-6 w-6 mb-1" />
            <span className="text-xs">프로필</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex flex-col items-center py-3"
              >
                <MoreHorizontal className="h-6 w-6 mb-1" />
                <span className="text-xs">더보기</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push('/notices')}>
                <Bell className="mr-2 h-4 w-4" />
                공지사항
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsUsePointOpen(true)}>
                <Wallet className="mr-2 h-4 w-4" />
                포인트 사용
              </DropdownMenuItem>
              {user.role === 'ADMIN' && (
                <DropdownMenuItem onClick={() => router.push('/admin')}>
                  <Settings className="mr-2 h-4 w-4" />
                  관리자 페이지
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 포인트 사용 모달 */}
      <Sheet open={isUsePointOpen} onOpenChange={setIsUsePointOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>상품 구매</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-4">
              <Label>현재 보유 포인트: {user.points.toLocaleString()} P</Label>
              <div className="grid grid-cols-2 gap-4">
                <Card
                  className={`cursor-pointer p-4 ${
                    selectedProduct === '라면' ? 'border-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedProduct('라면');
                    setSelectedAmount(3500);
                  }}
                >
                  <div className="text-center">
                    <div className="font-medium">라면</div>
                    <div className="text-sm text-muted-foreground">3,500 P</div>
                  </div>
                </Card>
                <Card
                  className={`cursor-pointer p-4 ${
                    selectedProduct === '음료' ? 'border-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedProduct('음료');
                    setSelectedAmount(2000);
                  }}
                >
                  <div className="text-center">
                    <div className="font-medium">음료</div>
                    <div className="text-sm text-muted-foreground">2,000 P</div>
                  </div>
                </Card>
              </div>
              {selectedProduct && (
                <div className="text-sm text-muted-foreground text-center mt-4">
                  선택한 상품: {selectedProduct} ({selectedAmount.toLocaleString()} P)
                </div>
              )}
            </div>
            <Button 
              onClick={handleUsePoints} 
              className="w-full"
              disabled={!selectedProduct}
            >
              {selectedProduct === '모임비' ? '지불하기' : '구매하기'}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">또는</span>
              </div>
            </div>

            {/* 모임비 지불 버튼 */}
            <Card className="p-4">
              <div className="flex flex-col items-center space-y-2">
                <div className="font-medium">모임비 지불</div>
                <div className="text-sm text-muted-foreground">12,000 P</div>
                <Button 
                  onClick={() => {
                    setSelectedProduct('모임비');
                    setSelectedAmount(12000);
                  }}
                  variant="outline"
                  className="w-full"
                  disabled={user.points < 12000}
                >
                  {user.points < 12000 ? '잔액이 부족합니다' : '지불하기'}
                </Button>
              </div>
            </Card>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
