"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, DollarSign, Shield, History, Phone, CreditCard, Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserDetail {
  id: string;
  username: string;
  name: string;
  role: string;
  points: number;
  isDealer: boolean;
  createdAt: string;
  bankAccount: string;
  phone: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  senderName: string | null;
  receiverName: string | null;
}

interface PointRequest {
  id: string;
  type: 'charge' | 'withdraw';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pointRequests, setPointRequests] = useState<PointRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPointDialogOpen, setIsPointDialogOpen] = useState(false);
  const [pointAmountForDialog, setPointAmountForDialog] = useState("");
  const [currentAdmin, setCurrentAdmin] = useState<{ username: string } | null>(null);

  const fetchUserDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/users/${params.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error("사용자 정보를 불러올 수 없습니다.");
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error("사용자 정보 로딩 에러:", error);
      toast({
        title: "오류",
        description: "사용자 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  }, [params.id, toast]);

  const fetchTransactions = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/users/${params.id}/transactions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error("거래 내역을 불러올 수 없습니다.");
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("거래 내역 로딩 에러:", error);
      toast({
        title: "오류",
        description: "거래 내역을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  }, [params.id, toast]);

  const fetchPointRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/users/${params.id}/point-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error("포인트 요청을 불러올 수 없습니다.");
      const data = await response.json();
      setPointRequests(data);
    } catch (error) {
      console.error("포인트 요청 로딩 에러:", error);
      toast({
        title: "오류",
        description: "포인트 요청을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  }, [params.id, toast]);

  const fetchCurrentAdmin = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("관리자 정보를 불러올 수 없습니다.");
      const data = await response.json();
      setCurrentAdmin(data);
    } catch (error) {
      console.error("관리자 정보 로딩 에러:", error);
    }
  }, []);

  const handlePointManage = async (action: 'add' | 'subtract') => {
    if (!pointAmountForDialog || parseInt(pointAmountForDialog) <= 0) {
      toast({
        title: "오류",
        description: "올바른 금액을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (user && currentAdmin) {
      const amount = parseInt(pointAmountForDialog);
      const description = `관리자(${currentAdmin.username})가 ${user.name}님의 포인트를 ${action === 'add' ? '충전' : '차감'} (${amount.toLocaleString()}P)`;
      
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/users/${user.id}/points`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            action, 
            amount,
            description,
            adminUsername: currentAdmin.username 
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "포인트 관리 중 오류가 발생했습니다.");
        }

        const result = await response.json();
        
        toast({
          title: "성공",
          description: result.message,
        });

        fetchUserDetails();
        setPointAmountForDialog("");
        setIsPointDialogOpen(false);
      } catch (error: unknown) {
        console.error("포인트 관리 에러:", error);
        toast({
          title: "오류",
          description: error instanceof Error ? error.message : "포인트 관리 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchUserDetails(),
          fetchTransactions(),
          fetchPointRequests(),
          fetchCurrentAdmin(),
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchUserDetails, fetchTransactions, fetchPointRequests, fetchCurrentAdmin]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">사용자를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          뒤로가기
        </Button>
        <h1 className="text-2xl font-bold">사용자 상세 정보</h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">이름</div>
                <div className="font-medium">{user.name}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">아이디</div>
                <div className="font-medium">{user.username}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">연락처</div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{user.phone || "-"}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">계좌번호</div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{user.bankAccount || "-"}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">가입일</div>
                <div className="font-medium">
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">포인트</div>
                <div className="flex items-center gap-2">
                  <div className="font-medium">{user.points.toLocaleString()}P</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPointDialogOpen(true)}
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    포인트 관리
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">권한</div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">
                    {user.role === "ADMIN" ? "관리자" : "일반"}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">딜러 여부</div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">
                    {user.isDealer ? "딜러" : "일반"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="transactions">
          <TabsList>
            <TabsTrigger value="transactions">
              <History className="h-4 w-4 mr-2" />
              거래 내역
            </TabsTrigger>
            <TabsTrigger value="point-requests">
              <DollarSign className="h-4 w-4 mr-2" />
              포인트 요청
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>거래 내역</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>날짜</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>설명</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          거래 내역이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            {new Date(tx.date).toLocaleString()}
                          </TableCell>
                          <TableCell>{tx.type}</TableCell>
                          <TableCell>{tx.amount.toLocaleString()}P</TableCell>
                          <TableCell>{tx.description}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="point-requests">
            <Card>
              <CardHeader>
                <CardTitle>포인트 요청</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>날짜</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pointRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          포인트 요청 내역이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pointRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            {new Date(request.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {request.type === 'charge' ? '충전' : '출금'}
                          </TableCell>
                          <TableCell>
                            {request.amount.toLocaleString()}P
                          </TableCell>
                          <TableCell>
                            <span className={
                              request.status === 'approved' ? 'text-green-600' :
                              request.status === 'rejected' ? 'text-red-600' :
                              'text-yellow-600'
                            }>
                              {request.status === 'approved' ? '승인됨' :
                               request.status === 'rejected' ? '거절됨' :
                               '대기중'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isPointDialogOpen} onOpenChange={setIsPointDialogOpen}>
          <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-t-lg sm:rounded-lg">
            <DialogHeader>
              <DialogTitle>포인트 관리</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-muted-foreground">사용자</div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.username}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">현재 포인트</div>
                  <div className="font-bold">{user.points.toLocaleString()}P</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>포인트 금액</Label>
                <Input
                  type="number"
                  placeholder="금액 입력"
                  value={pointAmountForDialog}
                  onChange={(e) => setPointAmountForDialog(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  * 차감 시 현재 잔액 이하로만 가능합니다.
                </p>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => handlePointManage('add')}
                >
                  충전하기
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handlePointManage('subtract')}
                  disabled={!pointAmountForDialog || parseInt(pointAmountForDialog) <= 0 || parseInt(pointAmountForDialog) > user.points}
                >
                  차감하기
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 