"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, History, Home } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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

export default function TransactionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageSize, setPageSize] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [dailyStats, setDailyStats] = useState<{ date: string; total: number }[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<{ month: string; total: number }[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 가져오기
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const fetchTransactions = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/transactions?page=${currentPage}&pageSize=${pageSize}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "포인트 내역을 불러올 수 없습니다.");
      }

      const data = await response.json();
      setTransactions(data.transactions);
      setTotalTransactions(data.total);

      // 일별, 월별 통계 계산
      const dailyMap = new Map<string, number>();
      const monthlyMap = new Map<string, number>();

      data.transactions.forEach((tx: Transaction) => {
        const date = new Date(tx.date);
        const dateKey = date.toISOString().split('T')[0];
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + tx.amount);
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + tx.amount);
      });

      setDailyStats(Array.from(dailyMap.entries()).map(([date, total]) => ({ date, total })));
      setMonthlyStats(Array.from(monthlyMap.entries()).map(([month, total]) => ({ month, total })));
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "포인트 내역을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchTransactions();
    }
  }, [fetchTransactions]);

  const totalPages = Math.ceil(totalTransactions / Number(pageSize));

  const handlePageSizeChange = (value: string) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto sm:p-4 p-0">
      <div className="flex justify-between items-center mb-6 p-4 sm:p-0 border-b sm:border-0">
        <h1 className="text-xl sm:text-2xl font-bold">포인트 내역</h1>
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

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="mb-4 w-full grid grid-cols-3 gap-2">
          <TabsTrigger value="transactions" className="text-sm sm:text-base">전체 내역</TabsTrigger>
          <TabsTrigger value="daily" className="text-sm sm:text-base">일별 통계</TabsTrigger>
          <TabsTrigger value="monthly" className="text-sm sm:text-base">월별 통계</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              <CardTitle className="text-lg sm:text-xl">포인트 내역</CardTitle>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <span className="text-sm text-muted-foreground whitespace-nowrap">페이지당 항목:</span>
                <Select
                  value={pageSize}
                  onValueChange={handlePageSizeChange}
                >
                  <SelectTrigger className="w-[80px] sm:w-[100px]">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10개</SelectItem>
                    <SelectItem value="20">20개</SelectItem>
                    <SelectItem value="100">100개</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-lg space-y-2 sm:space-y-0"
                  >
                    <div className="w-full sm:w-auto">
                      <div className="font-medium text-sm sm:text-base break-all">{transaction.description}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {new Date(transaction.date).toLocaleString()}
                      </div>
                    </div>
                    <div className={`font-bold text-sm sm:text-base ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'} w-full sm:w-auto text-right sm:text-left mt-2 sm:mt-0`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}P
                    </div>
                  </div>
                ))}

                {transactions.length === 0 && !isLoading && (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm sm:text-base">
                    포인트 내역이 없습니다.
                  </div>
                )}

                {isLoading && (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm sm:text-base">
                    로딩 중...
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2 mt-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || isLoading}
                      className="h-8 w-8 sm:h-9 sm:w-9"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-xs sm:text-sm px-2">
                      {currentPage} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || isLoading}
                      className="h-8 w-8 sm:h-9 sm:w-9"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">일별 포인트 통계</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dailyStats.map((stat) => (
                  <div
                    key={stat.date}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-lg space-y-2 sm:space-y-0"
                  >
                    <div className="font-medium text-sm sm:text-base">{stat.date}</div>
                    <div className={`font-bold text-sm sm:text-base ${stat.total > 0 ? 'text-green-600' : 'text-red-600'} w-full sm:w-auto text-right sm:text-left`}>
                      {stat.total > 0 ? '+' : ''}{stat.total.toLocaleString()}P
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">월별 포인트 통계</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyStats.map((stat) => (
                  <div
                    key={stat.month}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-lg space-y-2 sm:space-y-0"
                  >
                    <div className="font-medium text-sm sm:text-base">{stat.month}</div>
                    <div className={`font-bold text-sm sm:text-base ${stat.total > 0 ? 'text-green-600' : 'text-red-600'} w-full sm:w-auto text-right sm:text-left`}>
                      {stat.total > 0 ? '+' : ''}{stat.total.toLocaleString()}P
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 