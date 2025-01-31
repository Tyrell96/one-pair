"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Check, X, DollarSign, MoreHorizontal, Key, Trash2, UserPlus, Home } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  points: number;
  isDealer: boolean;
}

interface PointRequest {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
    username: string;
    points: number;
  };
  type: 'charge' | 'withdraw';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  senderName: string;
  senderUsername: string;
  receiverName: string;
  receiverUsername: string;
  description: string;
  date: string;
}

interface SelectedUser {
  id: string;
  name: string;
  username: string;
  points: number;
}

// 포인트 관리 모달 props 타입 정의
interface PointManageModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onManagePoints: (action: 'add' | 'subtract', amount: number) => void;
}

// 포인트 관리 모달 컴포넌트
function PointManageModal({ user, isOpen, onClose, onManagePoints }: PointManageModalProps) {
  const [amount, setAmount] = useState("");
  const [action, setAction] = useState<'add' | 'subtract'>('add');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseInt(amount) <= 0) return;
    onManagePoints(action, parseInt(amount));
    setAmount("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg shadow-lg w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">포인트 관리 - {user.name}</h3>
        <div className="text-sm text-muted-foreground mb-4">
          현재 포인트: {user.points.toLocaleString()}P
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={action === 'add' ? 'default' : 'outline'}
                onClick={() => setAction('add')}
                className="flex-1"
              >
                충전
              </Button>
              <Button
                type="button"
                variant={action === 'subtract' ? 'default' : 'outline'}
                onClick={() => setAction('subtract')}
                className="flex-1"
              >
                차감
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">포인트 금액</label>
            <Input
              type="number"
              placeholder="금액 입력"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              취소
            </Button>
            <Button 
              type="submit" 
              disabled={!amount || parseInt(amount) <= 0 || (action === 'subtract' && parseInt(amount) > user.points)}
            >
              확인
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [pointRequests, setPointRequests] = useState<PointRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [pointAmount, setPointAmount] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchType, setSearchType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransactionType, setSelectedTransactionType] = useState("all");
  const [tempSearchQuery, setTempSearchQuery] = useState("");
  const [pointModalUser, setPointModalUser] = useState<User | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<{name: string, username: string} | null>(null);

  // 사용자 목록 가져오기
  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("사용자 목록을 불러올 수 없습니다.");
      const data = await response.json();
      setUsers(data);
    } catch (error: unknown) {
      console.error("사용자 목록 로딩 에러:", error);
      toast({
        title: "오류",
        description: "사용자 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchPointRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/point-requests", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("포인트 요청을 불러올 수 없습니다.");
      const data = await response.json();
      
      // 응답 데이터 구조 확인 및 처리
      if (Array.isArray(data)) {
        setPointRequests(data);
      } else if (data.requests && Array.isArray(data.requests)) {
        setPointRequests(data.requests);
      } else {
        console.error("예상치 못한 응답 데이터 구조:", data);
        setPointRequests([]);
      }
    } catch (error: unknown) {
      console.error("포인트 요청 로딩 에러:", error);
      toast({
        title: "오류",
        description: "포인트 요청을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
      setPointRequests([]); // 에러 발생 시 빈 배열로 초기화
    }
  }, [toast]);

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoadingTransactions(true);
      const token = localStorage.getItem("token");
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      });

      // 검색 조건 추가
      if (searchQuery) {
        queryParams.append('search', searchQuery);
      }
      if (searchType !== 'all') {
        queryParams.append('searchType', searchType);
      }
      if (selectedTransactionType !== 'all') {
        queryParams.append('type', selectedTransactionType);
      }

      const response = await fetch(`/api/admin/transactions?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("거래 내역을 불러올 수 없습니다.");
      const data = await response.json();
      setTransactions(data.transactions);
      setTotalTransactions(data.total);
    } catch (error: unknown) {
      console.error("거래 내역 로딩 에러:", error);
      toast({
        title: "오류",
        description: "거래 내역을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [currentPage, pageSize, searchQuery, searchType, selectedTransactionType, toast]);

  // 현재 로그인한 관리자 정보 가져오기
  const fetchCurrentAdmin = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("사용자 정보를 불러올 수 없습니다.");
      const data = await response.json();
      setCurrentAdmin({ name: data.name, username: data.username });
    } catch (error) {
      console.error("관리자 정보 로딩 에러:", error);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/sign-in");
          return;
        }

        await Promise.all([
          fetchCurrentAdmin(),
          fetchUsers(),
          fetchPointRequests(),
          fetchTransactions()
        ]);
      } catch (error: unknown) {
        console.error("인증 체크 에러:", error);
        toast({
          title: "오류",
          description: "데이터를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      }
    };
    checkAuth();
  }, [router, toast, fetchUsers, fetchPointRequests, fetchTransactions, fetchCurrentAdmin]);

  // 관리자 권한 토글
  const toggleAdminRole = async (userId: string, currentRole: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: currentRole === "ADMIN" ? "USER" : "ADMIN",
        }),
      });

      if (!response.ok) throw new Error("권한 변경에 실패했습니다.");

      toast({
        title: "권한 변경 완료",
        description: "사용자의 권한이 변경되었습니다.",
      });

      fetchUsers();
    } catch (error: unknown) {
      console.error("권한 변경 에러:", error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "권한 변경에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 포인트 요청 처리
  const handlePointRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/point-requests/${requestId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("요청 처리에 실패했습니다.");

      toast({
        title: "성공",
        description: `요청이 ${status === 'approved' ? '승인' : '거절'}되었습니다.`,
      });

      // 포인트 요청 목록과 거래 내역 새로고침
      await Promise.all([
        fetchPointRequests(),
        fetchTransactions()
      ]);
    } catch (error: unknown) {
      console.error("포인트 요청 처리 에러:", error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (userId: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "resetPassword" }),
      });

      if (!response.ok) throw new Error("비밀번호 초기화에 실패했습니다.");
      const data = await response.json();

      toast({
        title: "비밀번호 초기화 완료",
        description: `임시 비밀번호: ${data.tempPassword}`,
      });
    } catch (error: unknown) {
      console.error("비밀번호 초기화 에러:", error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "비밀번호 초기화에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("정말 이 사용자를 삭제하시겠습니까?")) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("사용자 삭제에 실패했습니다.");

      toast({
        title: "사용자 삭제 완료",
        description: "사용자가 삭제되었습니다.",
      });

      fetchUsers();
    } catch (error: unknown) {
      console.error("사용자 삭제 에러:", error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "사용자 삭제에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDealerStatus = async (userId: string, currentStatus: boolean) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users/${userId}/dealer`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isDealer: !currentStatus,
        }),
      });

      if (!response.ok) throw new Error("딜러 상태 변경에 실패했습니다.");
      
      toast({
        title: "딜러 상태 변경 완료",
        description: `사용자가 ${!currentStatus ? '딜러' : '일반'} 상태로 변경되었습니다.`,
      });

      // 사용자 목록 새로고침
      await fetchUsers();
    } catch (error: unknown) {
      console.error("딜러 상태 변경 에러:", error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "딜러 상태 변경에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const totalPages = Math.ceil(totalTransactions / pageSize);

  const handleManagePoints = async (userId: string, action: 'add' | 'subtract', amount: number) => {
    if (!amount || amount <= 0) {
      toast({
        title: "오류",
        description: "올바른 금액을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/points`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          action, 
          amount,
          adminUsername: currentAdmin?.username || 'ADMIN' 
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

      fetchUsers();
    } catch (error: unknown) {
      console.error("포인트 관리 에러:", error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "포인트 관리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 사용자 검색 처리
  useEffect(() => {
    if (userSearchQuery.trim()) {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(userSearchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers([]);
    }
  }, [userSearchQuery, users]);

  // 검색 조건이 변경될 때마다 거래 내역을 다시 불러오기
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, searchQuery, searchType, selectedTransactionType]);

  // 검색 실행 함수
  const handleSearch = useCallback(() => {
    setSearchQuery(tempSearchQuery);
  }, [tempSearchQuery]);

  // 엔터키 처리 함수
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // 검색 타입 변경 처리
  const handleSearchTypeChange = useCallback((value: string) => {
    setSearchType(value);
    setCurrentPage(1);
    // 검색어가 있는 경우에만 자동 검색 실행
    if (searchQuery.trim()) {
      fetchTransactions();
    }
  }, [searchQuery, fetchTransactions]);

  // 거래 유형 변경 처리
  const handleTransactionTypeChange = useCallback((value: string) => {
    setSelectedTransactionType(value);
    setCurrentPage(1);
    fetchTransactions();
  }, [fetchTransactions]);

  // 포인트 관리 모달 핸들러
  const handlePointManage = useCallback(async (action: 'add' | 'subtract', amount: number) => {
    if (!pointModalUser) return;
    await handleManagePoints(pointModalUser.id, action, amount);
    setPointModalUser(null);
  }, [pointModalUser]);

  return (
    <div className="container mx-auto sm:p-4 p-0">
      <div className="flex justify-between items-center mb-6 p-4 sm:p-0 border-b sm:border-0">
        <h1 className="text-xl sm:text-2xl font-bold">관리자 페이지</h1>
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

      <Tabs defaultValue="points">
        <TabsList className="mb-4">
          <TabsTrigger value="points">포인트 요청</TabsTrigger>
          <TabsTrigger value="transactions">포인트 내역</TabsTrigger>
          <TabsTrigger value="point-management">포인트 관리</TabsTrigger>
          <TabsTrigger value="users">사용자 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="points">
          <Card>
            <CardHeader>
              <CardTitle>포인트 요청 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>요청일</TableHead>
                    <TableHead>사용자(ID)</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pointRequests && pointRequests.length > 0 ? (
                    pointRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div>{request.user.name}({request.user.username})</div>
                        </TableCell>
                        <TableCell>{request.type === "charge" ? "충전" : "출금"}</TableCell>
                        <TableCell>{request.amount.toLocaleString()}P</TableCell>
                        <TableCell>
                          <span className={
                            request.status === "approved" ? "text-green-600" :
                            request.status === "rejected" ? "text-red-600" :
                            "text-yellow-600"
                          }>
                            {request.status === "approved" ? "승인됨" :
                             request.status === "rejected" ? "거절됨" :
                             "대기중"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {request.status === "pending" && (
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePointRequest(request.id, "approved")}
                                disabled={isLoading}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                승인
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handlePointRequest(request.id, "rejected")}
                                disabled={isLoading}
                              >
                                <X className="h-4 w-4 mr-2" />
                                거절
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        포인트 요청이 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>포인트 내역 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <Select 
                  value={searchType} 
                  onValueChange={handleSearchTypeChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="검색 대상 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="sender">보낸 사람</SelectItem>
                    <SelectItem value="receiver">받은 사람</SelectItem>
                  </SelectContent>
                </Select>
                <Select 
                  value={selectedTransactionType} 
                  onValueChange={handleTransactionTypeChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="거래 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="충전">충전</SelectItem>
                    <SelectItem value="출금">출금</SelectItem>
                    <SelectItem value="전달">딜러 전달</SelectItem>
                    <SelectItem value="transfer">일반 전송</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="검색어 입력..."
                    value={tempSearchQuery}
                    onChange={(e) => setTempSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button 
                    variant="secondary"
                    onClick={handleSearch}
                  >
                    검색
                  </Button>
                </div>
                <Select 
                  value={pageSize.toString()} 
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="페이지당 항목 수" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10개씩 보기</SelectItem>
                    <SelectItem value="20">20개씩 보기</SelectItem>
                    <SelectItem value="100">100개씩 보기</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>날짜</TableHead>
                      <TableHead>보낸 사람</TableHead>
                      <TableHead>받은 사람</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>설명</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingTransactions ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          로딩 중...
                        </TableCell>
                      </TableRow>
                    ) : transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          내역이 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{new Date(tx.date).toLocaleString()}</TableCell>
                          <TableCell>
                            <div>{tx.senderName} ({tx.senderUsername})</div>
                          </TableCell>
                          <TableCell>
                            <div>{tx.receiverName} ({tx.receiverUsername})</div>
                          </TableCell>
                          <TableCell>{tx.type}</TableCell>
                          <TableCell>{tx.amount.toLocaleString()}P</TableCell>
                          <TableCell>{tx.description}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    총 {totalTransactions}개 중 {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalTransactions)}개
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1 || isLoadingTransactions}
                    >
                      처음
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || isLoadingTransactions}
                    >
                      이전
                    </Button>
                    <div className="text-sm">
                      {currentPage} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || isLoadingTransactions}
                    >
                      다음
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages || isLoadingTransactions}
                    >
                      마지막
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="point-management">
          <Card>
            <CardHeader>
              <CardTitle>포인트 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 사용자 검색 */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">사용자 검색</label>
                    <Input
                      placeholder="이름 또는 아이디로 검색..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {/* 검색 결과 */}
                  {userSearchQuery && filteredUsers.length > 0 && (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>이름</TableHead>
                            <TableHead>아이디</TableHead>
                            <TableHead>현재 포인트</TableHead>
                            <TableHead>선택</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>{user.username}</TableCell>
                              <TableCell>{user.points.toLocaleString()}P</TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPointModalUser(user)}
                                >
                                  선택
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* 전체 사용자 목록 */}
                  {!userSearchQuery && (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>이름</TableHead>
                            <TableHead>아이디</TableHead>
                            <TableHead>현재 포인트</TableHead>
                            <TableHead>선택</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>{user.username}</TableCell>
                              <TableCell>{user.points.toLocaleString()}P</TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPointModalUser(user)}
                                >
                                  선택
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* 선택된 사용자 정보 및 포인트 관리 */}
                {pointModalUser && (
                  <div className="border rounded-md p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold">{pointModalUser.name}</h3>
                        <p className="text-sm text-muted-foreground">{pointModalUser.username}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">현재 포인트</div>
                        <div className="text-xl font-bold">{pointModalUser.points.toLocaleString()}P</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">포인트 금액</label>
                        <Input
                          type="number"
                          placeholder="금액 입력"
                          value={pointAmount}
                          onChange={(e) => setPointAmount(e.target.value)}
                        />
                      </div>
                      <div className="flex items-end space-x-2">
                        <Button
                          className="flex-1"
                          onClick={() => {
                            handleManagePoints(pointModalUser.id, "add", parseInt(pointAmount));
                            setPointAmount("");
                            // 사용자 정보 업데이트
                            const updatedUser = users.find(u => u.id === pointModalUser.id);
                            if (updatedUser) {
                              setPointModalUser({
                                ...pointModalUser,
                                points: updatedUser.points,
                              });
                            }
                          }}
                          disabled={!pointAmount || parseInt(pointAmount) <= 0}
                        >
                          충전
                        </Button>
                        <Button
                          className="flex-1"
                          variant="destructive"
                          onClick={() => {
                            handleManagePoints(pointModalUser.id, "subtract", parseInt(pointAmount));
                            setPointAmount("");
                            // 사용자 정보 업데이트
                            const updatedUser = users.find(u => u.id === pointModalUser.id);
                            if (updatedUser) {
                              setPointModalUser({
                                ...pointModalUser,
                                points: updatedUser.points,
                              });
                            }
                          }}
                          disabled={!pointAmount || parseInt(pointAmount) <= 0 || parseInt(pointAmount) > pointModalUser.points}
                        >
                          차감
                        </Button>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      * 차감은 현재 보유 포인트 이하만 가능합니다.
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>사용자 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">사용자 관리</h1>
                <Button onClick={() => window.location.href = "/admin/users/create"}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  계정 생성
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>아이디</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>권한</TableHead>
                    <TableHead>딜러</TableHead>
                    <TableHead>포인트</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.role === "ADMIN" ? "관리자" : "일반"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={user.isDealer ? "default" : "outline"}
                          size="sm"
                          className="w-[100px]"
                          onClick={() => toggleDealerStatus(user.id, user.isDealer)}
                          disabled={isLoading}
                        >
                          {user.isDealer ? "딜러" : "일반"}
                        </Button>
                      </TableCell>
                      <TableCell>{user.points.toLocaleString()}P</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => toggleAdminRole(user.id, user.role)}
                              disabled={isLoading}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              {user.role === "ADMIN" ? "관리자 해제" : "관리자 지정"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleResetPassword(user.id)}
                              disabled={isLoading}
                            >
                              <Key className="mr-2 h-4 w-4" />
                              비밀번호 초기화
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setPointModalUser(user)}
                            >
                              <DollarSign className="mr-2 h-4 w-4" />
                              포인트 관리
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={isLoading}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              계정 삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 포인트 관리 모달 */}
      {pointModalUser && (
        <PointManageModal
          user={pointModalUser}
          isOpen={!!pointModalUser}
          onClose={() => setPointModalUser(null)}
          onManagePoints={handlePointManage}
        />
      )}
    </div>
  );
} 