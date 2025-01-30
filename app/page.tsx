"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, History, TrendingUp, LogOut, User, Wallet, DollarSign, Trash2, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import jwt from "jsonwebtoken";
import { Label } from "@/components/ui/label";

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
  name: string;
  email: string;
  points: number;
  role: string;
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
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [currentPoints, setCurrentPoints] = useState(1000);
  const [isPointRequestOpen, setIsPointRequestOpen] = useState(false);
  const [pointRequestAmount, setPointRequestAmount] = useState("");
  const [pointRequestType, setPointRequestType] = useState<'charge' | 'withdraw'>('charge');
  const [isLoading, setIsLoading] = useState(false);
  const [dailyPointData, setDailyPointData] = useState<DailyPointData[]>([]);
  const [hourlyPointData, setHourlyPointData] = useState<HourlyPointData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [isUsePointOpen, setIsUsePointOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState(0);

  const processPointHistory = useCallback((transactions: any[]) => {
    const dailyMap = new Map<string, number>();
    const hourlyMap = new Map<string, number>();

    // 거래 내역을 날짜 기준으로 정렬 (최신 순)
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // 최근 7일 동안의 날짜 배열 생성
    const last7Days = Array.from({length: 7}, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    // 최근 24시간의 시간 배열 생성
    const last24Hours = Array.from({length: 24}, (_, i) => {
      const hour = String(i).padStart(2, '0');
      return `${hour}`;
    });

    // 일별 변동량 계산
    last7Days.forEach(dateKey => {
      const dayTransactions = sortedTransactions.filter(tx => 
        new Date(tx.date).toISOString().split('T')[0] === dateKey
      );
      
      const dayTotal = dayTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      dailyMap.set(dateKey, dayTotal);
    });

    // 시간별 변동량 계산
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    last24Hours.forEach(hourKey => {
      const [hour] = hourKey.split(':');
      const currentHourTotal = sortedTransactions
        .filter(tx => {
          const txDate = new Date(tx.date);
          const txHour = txDate.getHours();
          return txHour === parseInt(hour) && txDate >= oneDayAgo;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      hourlyMap.set(hourKey, currentHourTotal || 0);
    });

    // 일별 데이터 설정
    setDailyPointData(
      Array.from(dailyMap.entries())
        .map(([date, points]) => ({ 
          date,
          points,
          label: formatDateLabel(date)
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
    );

    // 시간별 데이터 설정
    setHourlyPointData(
      Array.from(hourlyMap.entries())
        .map(([hour, points]) => ({ 
          hour,
          points,
          label: hour
        }))
    );

    // 포인트 내역 설정
    setPointHistory(
      sortedTransactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description || '내역 없음',
        date: formatDate(tx.date)
      }))
    );
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (!token || !storedUser) {
        router.push("/sign-in");
        return;
      }

      // 먼저 저장된 사용자 정보 표시
      const cachedUser = JSON.parse(storedUser);
      setUser(cachedUser);

      // 백그라운드에서 최신 데이터 가져오기
      const [userResponse, historyResponse] = await Promise.all([
        fetch("/api/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/transactions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (!userResponse.ok || !historyResponse.ok) {
        throw new Error("데이터를 불러올 수 없습니다.");
      }

      const [userData, historyData] = await Promise.all([
        userResponse.json(),
        historyResponse.json(),
      ]);

      setUser(userData);
      setPointHistory(historyData.transactions);
      processPointHistory(historyData.transactions);
    } catch (error: unknown) {
      console.error("인증 체크 에러:", error);
      toast({
        title: "오류",
        description: "사용자 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  }, [router, toast]);

  // 사용자 인증 체크 및 정보 로드
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 포인트 내역 가져오기
  const fetchPointHistory = useCallback(async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/transactions?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('포인트 내역을 불러올 수 없습니다.');
      const data = await response.json();
      setPointHistory(data.transactions);
      processPointHistory(data.transactions);
    } catch (error) {
      console.error("포인트 내역 로딩 에러:", error);
    }
  }, [processPointHistory]);

  // 플레이어 목록 불러오기
  const fetchPlayers = useCallback(async () => {
    try {
      const response = await fetch('/api/players');
      if (!response.ok) throw new Error('플레이어 목록을 불러오는데 실패했습니다.');
      const data = await response.json();
      setPlayers(data);
    } catch (error) {
      toast({
        title: "오류",
        description: "플레이어 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handleAddPlayer = useCallback(async () => {
    if (!newPlayerName.trim()) {
      toast({
        title: "오류",
        description: "플레이어 이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newPlayerName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '플레이어 추가에 실패했습니다.');
      }

      const newPlayer = await response.json();
      setPlayers(prev => [newPlayer, ...prev]);
      setNewPlayerName("");
      
      toast({
        title: "플레이어 추가",
        description: `${newPlayer.name}님이 등록되었습니다.`,
      });
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [newPlayerName, toast]);

  const handleRemovePlayer = useCallback(async (playerId: string) => {
    try {
      const response = await fetch(`/api/players?id=${playerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('플레이어 삭제에 실패했습니다.');

      setPlayers(prev => prev.filter(p => p.id !== playerId));
      
      toast({
        title: "플레이어 삭제",
        description: "플레이어가 삭제되었습니다.",
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "플레이어 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleAddSavedPlayer = useCallback((player: Player) => {
    if (players.some(p => p.id === player.id)) {
      toast({
        title: "오류",
        description: "이미 게임에 참여 중인 플레이어입니다.",
        variant: "destructive",
      });
      return;
    }

    setPlayers(prev => [...prev, player]);
    sessionStorage.setItem("gamePlayers", JSON.stringify([...players, player]));
    
    toast({
      title: "플레이어 추가",
      description: `${player.name}님이 게임에 참여했습니다.`,
    });
  }, [players, toast]);

  const handleRemoveSavedPlayer = useCallback((playerId: string) => {
    const updatedSavedPlayers = savedPlayers.filter(p => p.id !== playerId);
    localStorage.setItem("savedPlayers", JSON.stringify(updatedSavedPlayers));
    setSavedPlayers(updatedSavedPlayers);
    
    toast({
      title: "플레이어 삭제",
      description: "저장된 플레이어가 삭제되었습니다.",
    });
  }, [savedPlayers, toast]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push('/sign-in');
  }, [router]);

  // 사용자 정보 새로고침
  const refreshUserInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('사용자 정보를 불러올 수 없습니다.');
      const updatedUser = await response.json();
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // 사용자 정보가 업데이트되면 포인트 내역도 새로고침
      if (updatedUser) {
        fetchPointHistory(updatedUser.id);
      }
    } catch (error) {
      console.error('사용자 정보 새로고침 에러:', error);
    }
  }, [fetchPointHistory]);

  // 주기적으로 사용자 정보 새로고침 (10초마다)
  useEffect(() => {
    const interval = setInterval(refreshUserInfo, 10000);
    return () => clearInterval(interval);
  }, [refreshUserInfo]);

  // user 상태가 변경될 때마다 포인트 내역 새로고침
  useEffect(() => {
    if (user?.id) {
      fetchPointHistory(user.id);
    }
  }, [user?.id, fetchPointHistory]);

  const handlePointRequest = useCallback(async () => {
    if (!user) return;
    
    const amount = parseInt(pointRequestAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "오류",
        description: "올바른 금액을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 출금 시 잔액 체크
    if (pointRequestType === 'withdraw' && amount > user.points) {
      toast({
        title: "오류",
        description: "출금 금액이 현재 잔액을 초과합니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/point-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: pointRequestType,
          amount,
          userId: user.id,
        }),
      });

      if (!response.ok) throw new Error('요청 처리 중 오류가 발생했습니다.');

      toast({
        title: "요청 완료",
        description: `포인트 ${pointRequestType === 'charge' ? '충전' : '출금'} 요청이 전달되었습니다.`,
      });
      setIsPointRequestOpen(false);
      setPointRequestAmount("");
      
      // 포인트 내역 새로고침
      fetchPointHistory(user.id);
      // 사용자 정보 새로고침
      refreshUserInfo();
    } catch (error) {
      toast({
        title: "오류",
        description: "요청 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  }, [pointRequestAmount, pointRequestType, toast, user?.id, fetchPointHistory, refreshUserInfo]);

  const handleSeatAssignment = useCallback(() => {
    if (players.length === 0) {
      toast({
        title: "오류",
        description: "참여 플레이어가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    // 현재 참여 플레이어 목록을 세션 스토리지에 저장
    sessionStorage.setItem("gamePlayers", JSON.stringify(players));
    
    // 테이블 설정 페이지로 이동
    router.push('/table-setup');
  }, [savedPlayers, router]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleAddPlayer();
    }
  }, [handleAddPlayer]);

  const refreshPoints = useCallback(async () => {
    if (isRefreshing || !user?.id) return;
    
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem("token");
      const [userResponse, historyResponse] = await Promise.all([
        fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/transactions?userId=${user.id}&page=1&pageSize=10`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);

      if (userResponse.ok && historyResponse.ok) {
        const [userData, historyData] = await Promise.all([
          userResponse.json(),
          historyResponse.json()
        ]);

        // 데이터가 올바른 형식인지 확인
        if (userData && userData.user && typeof userData.user.points === 'number') {
          setUser(userData.user);
          localStorage.setItem("user", JSON.stringify(userData.user));

          // 포인트 내역 데이터 업데이트
          if (historyData && Array.isArray(historyData.transactions)) {
            processPointHistory(historyData.transactions);
          }
        }

        setLastRefreshTime(new Date());
        
        toast({
          title: "새로고침 완료",
          description: "포인트 정보가 업데이트되었습니다.",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "포인트 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [toast, user?.id, processPointHistory]);

  const handleSelectProduct = useCallback((product: string, price: number) => {
    setSelectedProduct(product);
    setSelectedAmount(price);
  }, []);

  const handleUsePoints = useCallback(async () => {
    if (!selectedProduct || !user?.points || selectedAmount > user.points) {
      toast({
        title: "오류",
        description: "올바른 상품을 선택하고 잔액을 확인해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/points/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          product: selectedProduct === 'ramen' ? '라면' :
                  selectedProduct === 'drink_s' ? '음료수 (소)' :
                  selectedProduct === 'drink_m' ? '음료수 (중)' : '음료수 (대)',
          amount: selectedAmount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '포인트 사용 중 오류가 발생했습니다.');
      }

      const data = await response.json();
      
      toast({
        title: "구매 완료",
        description: data.message,
      });
      // 포인트 내역 새로고침
      if (user?.id) {
        fetchPointHistory(user.id);
      }
      // 사용자 정보 새로고침
      refreshUserInfo();

      // 다이얼로그 닫기
      setIsUsePointOpen(false);
      // 선택한 상품 초기화
      setSelectedProduct(null);
      setSelectedAmount(0);
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "포인트 사용 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  }, [selectedProduct, selectedAmount, toast, user, fetchPointHistory, refreshUserInfo]);

  // 토큰 만료 체크
  const checkTokenExpiration = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const decoded = jwt.decode(token) as { exp: number };
      if (!decoded || !decoded.exp) return;

      const expirationTime = decoded.exp * 1000; // 밀리초로 변환
      const currentTime = Date.now();

      if (currentTime >= expirationTime) {
        // 토큰이 만료되었으면 로그아웃
        handleLogout();
        toast({
          title: "세션 만료",
          description: "보안을 위해 자동으로 로그아웃되었습니다. 다시 로그인해주세요.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("토큰 검증 에러:", error);
    }
  }, [handleLogout, toast]);

  // 1분마다 토큰 만료 체크
  useEffect(() => {
    const tokenCheckInterval = setInterval(checkTokenExpiration, 60000);
    return () => clearInterval(tokenCheckInterval);
  }, [checkTokenExpiration]);

  // 페이지 로드 시 즉시 한 번 체크
  useEffect(() => {
    checkTokenExpiration();
  }, [checkTokenExpiration]);

  // 로딩 상태 표시
  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-8 text-center">
            로딩 중...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto sm:p-4 p-0">
      <div className="flex flex-col sm:flex-row justify-end items-center mb-6 p-4 sm:p-0 border-b sm:border-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center w-full sm:w-auto">
          <div className="flex justify-end items-center space-x-2 w-full sm:w-auto">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setIsPointRequestOpen(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                포인트 요청
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={refreshPoints}
              className="flex items-center space-x-2"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">새로고침</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center justify-between space-x-2">
                  {user && (
                    <div className="flex items-center space-x-2 px-2 py-1 rounded-full bg-primary/10">
                      <span className="font-medium text-sm">{user.name}</span>
                      <span className="font-medium">{user.points.toLocaleString()}P</span>
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user && (
                  <>
                    <DropdownMenuItem onClick={() => router.push("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      프로필 수정
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/transactions")}>
                      <History className="mr-2 h-4 w-4" />
                      포인트 내역
                    </DropdownMenuItem>
                    {user.role === "ADMIN" && (
                      <DropdownMenuItem onClick={() => router.push("/admin")}>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        관리자
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      로그아웃
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-0">
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
            <h2 className="text-xl sm:text-2xl font-bold">포인트 관리</h2>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
              <Button
                variant="default"
                onClick={() => router.push('/payment')}
                className="w-full sm:w-auto"
              >
                <DollarSign className="mr-2 h-4 w-4" />
                딜러에게 포인트 전달
              </Button>
              <Button
                variant="default"
                onClick={() => setIsUsePointOpen(true)}
                className="w-full sm:w-auto"
              >
                <Wallet className="mr-2 h-4 w-4" />
                포인트 사용
              </Button>
            </div>
          </div>

          <Tabs defaultValue="points" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="points" className="text-sm sm:text-base">
                <TrendingUp className="mr-2 h-4 w-4" />
                포인트 변동 그래프
              </TabsTrigger>
              <TabsTrigger value="history" className="text-sm sm:text-base">
                <History className="mr-2 h-4 w-4" />
                포인트 내역
              </TabsTrigger>
            </TabsList>
            <TabsContent value="points">
              <Card className="border-0 sm:border shadow-none sm:shadow">
                <CardHeader className="px-0 sm:px-6">
                  <CardTitle className="text-lg sm:text-xl">포인트 변동 그래프</CardTitle>
                </CardHeader>
                <CardContent className="px-0 sm:px-6">
                  <Tabs defaultValue="daily">
                    <TabsList className="w-full grid grid-cols-2">
                      <TabsTrigger value="daily">일별 보유량</TabsTrigger>
                      <TabsTrigger value="hourly">시간별 변동</TabsTrigger>
                    </TabsList>
                    <TabsContent value="daily">
                      <div className="h-[300px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dailyPointData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(value) => {
                                if (!value) return '';
                                const date = new Date(value);
                                return `${date.getMonth() + 1}/${date.getDate()}`;
                              }}
                              interval={0}
                            />
                            <YAxis />
                            <Tooltip 
                              labelFormatter={(value) => value ? formatDate(value) : ''}
                              formatter={(value: number) => [value.toLocaleString() + 'P', '보유 포인트']}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="points" 
                              name="보유 포인트"
                              stroke="#2563eb" 
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </TabsContent>
                    <TabsContent value="hourly">
                      <div className="h-[300px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={hourlyPointData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="hour"
                              interval={0}
                              angle={0}
                              tickFormatter={(value) => value.split(':')[0]} // 시간만 표시
                              height={30}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis />
                            <Tooltip 
                              labelFormatter={(value) => `${value.split(':')[0]}시`}
                              formatter={(value: number) => [value.toLocaleString() + 'P', '변동 포인트']}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="points" 
                              stroke="#2563eb" 
                              strokeWidth={2}
                              dot={{ r: 3 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>포인트 사용 내역</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pointHistory.map((history, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded"
                      >
                        <div>
                          <div className="font-medium">{history.description || '내역 없음'}</div>
                          <div className="text-sm text-gray-500">
                            {history.date ? formatDate(history.date) : '-'}
                          </div>
                        </div>
                        <div className={`font-bold ${(history.amount || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(history.amount || 0) >= 0 ? '+' : ''}
                          {(history.amount || 0).toLocaleString()} P
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* 플레이어 등록 섹션 */}
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>플레이어 등록</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="플레이어 이름"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                  />
                  <Button onClick={handleAddPlayer} disabled={isLoading}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">참여 플레이어 목록</h3>
                    <span className="text-sm text-muted-foreground">
                      총 {players.length}명
                    </span>
                  </div>
                  {players.length === 0 ? (
                    <div className="text-center p-4 text-muted-foreground">
                      등록된 플레이어가 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {players.map(player => (
                        <div
                          key={player.id}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded"
                        >
                          <div>
                            <span className="font-medium">{player.name}</span>
                            <div className="text-sm text-muted-foreground">
                              {new Date(player.createdAt!).toLocaleDateString()}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePlayer(player.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <Button 
                    className="w-full" 
                    onClick={handleSeatAssignment}
                    disabled={players.length === 0}
                  >
                    테이블 설정하기
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 포인트 사용 다이얼로그 */}
      <Dialog open={isUsePointOpen} onOpenChange={setIsUsePointOpen}>
        <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-t-lg sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>포인트 사용</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">현재 잔액</div>
              <div className="font-bold">{user?.points?.toLocaleString()}P</div>
            </div>
            <div className="space-y-2">
              <Label>상품 선택</Label>
              <div className="grid gap-2">
                <Button
                  variant={selectedProduct === 'ramen' ? 'default' : 'outline'}
                  onClick={() => handleSelectProduct('ramen', 2000)}
                  className="w-full justify-between"
                >
                  <span>라면</span>
                  <span>2,000P</span>
                </Button>
                <Button
                  variant={selectedProduct === 'drink_s' ? 'default' : 'outline'}
                  onClick={() => handleSelectProduct('drink_s', 1000)}
                  className="w-full justify-between"
                >
                  <span>음료수 (소)</span>
                  <span>1,000P</span>
                </Button>
                <Button
                  variant={selectedProduct === 'drink_m' ? 'default' : 'outline'}
                  onClick={() => handleSelectProduct('drink_m', 1500)}
                  className="w-full justify-between"
                >
                  <span>음료수 (중)</span>
                  <span>1,500P</span>
                </Button>
                <Button
                  variant={selectedProduct === 'drink_l' ? 'default' : 'outline'}
                  onClick={() => handleSelectProduct('drink_l', 3000)}
                  className="w-full justify-between"
                >
                  <span>음료수 (대)</span>
                  <span>3,000P</span>
                </Button>
              </div>
            </div>
            <Button 
              onClick={handleUsePoints} 
              className="w-full"
              disabled={!selectedProduct || selectedAmount > (user?.points || 0)}
            >
              구매하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 포인트 요청 다이얼로그 */}
      <Dialog open={isPointRequestOpen} onOpenChange={setIsPointRequestOpen}>
        <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-t-lg sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>포인트 {pointRequestType === 'charge' ? '충전' : '출금'} 요청</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">현재 잔액</div>
              <div className="font-bold">{user?.points?.toLocaleString()}P</div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={pointRequestType === 'charge' ? 'default' : 'outline'}
                onClick={() => setPointRequestType('charge')}
                className="flex-1"
              >
                충전
              </Button>
              <Button
                variant={pointRequestType === 'withdraw' ? 'default' : 'outline'}
                onClick={() => setPointRequestType('withdraw')}
                className="flex-1"
              >
                출금
              </Button>
            </div>
            <div className="space-y-2">
              <Label>금액</Label>
              <Input
                type="number"
                placeholder="금액 입력"
                value={pointRequestAmount}
                onChange={(e) => setPointRequestAmount(e.target.value)}
              />
              {pointRequestType === 'withdraw' && (
                <p className="text-sm text-muted-foreground">
                  * 현재 잔액 이하로만 출금 가능합니다.
                </p>
              )}
            </div>
            <Button 
              onClick={handlePointRequest} 
              className="w-full"
              disabled={!pointRequestAmount || parseInt(pointRequestAmount) <= 0 || 
                (pointRequestType === 'withdraw' && parseInt(pointRequestAmount) > (user?.points || 0))}
            >
              요청하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
