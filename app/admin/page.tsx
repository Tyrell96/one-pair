"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, DollarSign, History, Trash2, User, Wallet,
  Check, X, MoreHorizontal, KeyRound 
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface User {
  isDealer: boolean;
  id: string;
  username: string;
  name: string;
  role: string;
  points: number;
  createdAt: string;
  nickname: string;
  bankAccount: string | null;
}

interface PointRequest {
  id: string;
  type: string;
  amount: number;
  status: string;
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
    points: number;
    isDealer: boolean;
  };
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
  isDealer: boolean;
}

interface UserDetail extends User {
  phone: string;
  bankAccount: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userManageSearchQuery, setUserManageSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [pointRequests, setPointRequests] = useState<PointRequest[]>([]);
  const [filteredPointRequests, setFilteredPointRequests] = useState<PointRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const [currentPointRequestPage, setCurrentPointRequestPage] = useState(1);
  const [currentTransactionPage, setCurrentTransactionPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);
  const [pointRequestPageSize, setPointRequestPageSize] = useState(10);
  const [transactionPageSize, setTransactionPageSize] = useState(10);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [searchType, setSearchType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPointDialogOpen, setIsPointDialogOpen] = useState(false);
  const [selectedUserForPoints, setSelectedUserForPoints] = useState<SelectedUser | null>(null);
  const [pointAmountForDialog, setPointAmountForDialog] = useState("");
  const [currentAdmin, setCurrentAdmin] = useState<{ username: string } | null>(null);
  const [activeSearchParams, setActiveSearchParams] = useState<{ type: string; query: string } | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetail | null>(null);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);

  // 사용자 목록 가져오기
  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/users", {
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
      const response = await fetch("/api/admin/point-requests", {
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

  const fetchTransactions = useCallback(async (searchParams?: { type: string; query: string }) => {
    try {
      setIsLoadingTransactions(true);
      const token = localStorage.getItem("token");
      
      // 검색 조건을 쿼리 파라미터로 추가
      let url = `/api/admin/transactions?page=${currentTransactionPage}&pageSize=${transactionPageSize}`;
      
      // 활성화된 검색 조건이 있으면 사용
      const activeParams = searchParams || activeSearchParams;
      if (activeParams?.query && activeParams.query.trim() !== "") {
        url += `&searchType=${activeParams.type}&searchQuery=${encodeURIComponent(activeParams.query)}`;
      }

      const response = await fetch(url, {
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
  }, [currentTransactionPage, transactionPageSize, activeSearchParams, toast]);

  // 현재 관리자 정보 가져오기
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

  useEffect(() => {
    fetchCurrentAdmin();
  }, [fetchCurrentAdmin]);

  // 초기 로딩 시에만 거래 내역을 가져오도록 수정
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/sign-in");
          return;
        }

        await Promise.all([
          fetchUsers(),
          fetchPointRequests(),
          fetchTransactions() // 초기 로딩
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
  }, [router, toast, fetchUsers, fetchPointRequests, fetchTransactions]);

  // 페이지 변경 시에만 거래 내역을 가져오도록 수정
  useEffect(() => {
    if (currentTransactionPage > 0) {
      fetchTransactions();
    }
  }, [currentTransactionPage, fetchTransactions]);

  // 관리자 권한 토글
  const toggleAdminRole = async (userId: string, currentRole: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: currentRole ? "USER" : "ADMIN",
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
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("정말 이 사용자를 삭제하시겠습니까?")) return;

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
    }
  };

  const toggleDealerStatus = async (userId: string, currentStatus: boolean) => {
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
    }
  };

  // 사용자 관리 검색 처리
  const handleUserManageSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userManageSearchQuery.trim()) {
      resetSearch();
      return;
    }
    setIsSearching(true);
    const filteredUsers = users.filter(user => 
      user.name.toLowerCase().includes(userManageSearchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(userManageSearchQuery.toLowerCase())
    );
    setUsers(filteredUsers);
  };

  const resetSearch = useCallback(async () => {
    setUserManageSearchQuery("");
    setIsSearching(false);
    await fetchUsers();
  }, [fetchUsers]);

  // 포인트 관리 다이얼로그에서 포인트 처리
  const handlePointManageFromDialog = async (action: 'add' | 'subtract') => {
    if (!pointAmountForDialog || parseInt(pointAmountForDialog) <= 0) {
      toast({
        title: "오류",
        description: "올바른 금액을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (selectedUserForPoints && currentAdmin) {
      const amount = parseInt(pointAmountForDialog);
      const description = `관리자(${currentAdmin.username})가 ${selectedUserForPoints.name}님의 포인트를 ${action === 'add' ? '충전' : '차감'} (${amount.toLocaleString()}P)`;
      
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/users/${selectedUserForPoints.id}/points`, {
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

        fetchUsers();
        setPointAmountForDialog("");
        setIsPointDialogOpen(false);
        setSelectedUserForPoints(null);
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

  // 검색 폼 제출 핸들러
  const handleTransactionSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setCurrentTransactionPage(1); // 검색 시 첫 페이지로 이동
    const newSearchParams = { type: searchType, query: searchQuery };
    setActiveSearchParams(newSearchParams);
    fetchTransactions(newSearchParams);
  }, [fetchTransactions, searchType, searchQuery]);

  // 검색 초기화 핸들러
  const resetTransactionSearch = useCallback(() => {
    setSearchType("all");
    setSearchQuery("");
    setCurrentTransactionPage(1); // 초기화 시 첫 페이지로 이동
    setActiveSearchParams(null);
    fetchTransactions({ type: "all", query: "" }); // 빈 검색 조건으로 요청
  }, [fetchTransactions]);

  // 페이지네이션 헬퍼 함수
  const getPaginatedData = <T,>(data: T[], currentPage: number, pageSize: number) => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalItems: number, pageSize: number) => {
    return Math.ceil(totalItems / pageSize);
  };

  // 사용자 관리 페이지네이션 처리
  useEffect(() => {
    const paginatedUsers = getPaginatedData(users, currentUserPage, userPageSize);
    setFilteredUsers(paginatedUsers);
  }, [users, currentUserPage, userPageSize]);

  // 포인트 요청 페이지네이션 처리
  useEffect(() => {
    const paginatedRequests = getPaginatedData(pointRequests, currentPointRequestPage, pointRequestPageSize);
    setFilteredPointRequests(paginatedRequests);
  }, [pointRequests, currentPointRequestPage, pointRequestPageSize]);

  // 페이지 크기 선택 컴포넌트
  const PageSizeSelector = ({
    pageSize,
    setPageSize,
    totalItems,
    currentPage,
  }: {
    pageSize: number;
    setPageSize: (size: number) => void;
    totalItems: number;
    currentPage: number;
  }) => (
    <div className="flex justify-end items-center gap-2 mb-4">
      <span className="text-sm text-muted-foreground">
        총 {totalItems}개 중 {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalItems)}
      </span>
      <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
        <SelectTrigger className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="10">10개씩</SelectItem>
          <SelectItem value="20">20개씩</SelectItem>
          <SelectItem value="50">50개씩</SelectItem>
          <SelectItem value="100">100개씩</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  // 페이지네이션 컨트롤 컴포넌트
  const PaginationControls = ({ 
    currentPage, 
    totalItems, 
    pageSize, 
    setCurrentPage,
  }: { 
    currentPage: number;
    totalItems: number;
    pageSize: number;
    setCurrentPage: (page: number) => void;
  }) => {
    const totalPages = getTotalPages(totalItems, pageSize);

    return (
      <div className="flex justify-center items-center gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
        >
          처음
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          이전
        </Button>
        <span className="text-sm mx-4">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          다음
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
        >
          마지막
        </Button>
      </div>
    );
  };

  const handleViewUserDetail = async (userId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("사용자 정보를 불러올 수 없습니다.");
      }

      const data = await response.json();
      setSelectedUserDetail(data);
      setIsUserDetailOpen(true);
    } catch {
      toast({
        title: "오류",
        description: "사용자 정보를 불러올 수 없습니다.",
        variant: "destructive",
      });
    }
  };

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
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">홈으로</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="point-requests">
        <TabsList className="mb-4">
          <TabsTrigger value="point-requests">
            <DollarSign className="h-4 w-4 mr-2" />
            포인트 요청
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <History className="h-4 w-4 mr-2" />
            거래 내역
          </TabsTrigger>
          <TabsTrigger value="users">
            <User className="h-4 w-4 mr-2" />
            사용자 관리
          </TabsTrigger>
        </TabsList>

        <TabsContent value="point-requests">
          <Card>
            <CardHeader>
              <CardTitle>포인트 요청 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <PageSizeSelector
                pageSize={pointRequestPageSize}
                setPageSize={setPointRequestPageSize}
                totalItems={pointRequests.length}
                currentPage={currentPointRequestPage}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>요청일</TableHead>
                    <TableHead>사용자(아이디)</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPointRequests.length > 0 ? (
                    filteredPointRequests.map((request) => (
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
                              >
                                <Check className="h-4 w-4 mr-2" />
                                승인
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handlePointRequest(request.id, "rejected")}
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
              <PaginationControls
                currentPage={currentPointRequestPage}
                totalItems={pointRequests.length}
                pageSize={pointRequestPageSize}
                setCurrentPage={setCurrentPointRequestPage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>거래 내역</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <form onSubmit={handleTransactionSearch} className="flex flex-col sm:flex-row gap-2">
                    <Select 
                      value={searchType} 
                      onValueChange={setSearchType}
                      name="searchType"
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
                    <div className="flex-1">
                      <Input
                        placeholder="검색어 입력..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit">검색</Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={resetTransactionSearch}
                      >
                        초기화
                      </Button>
                    </div>
                  </form>
                  <PageSizeSelector
                    pageSize={transactionPageSize}
                    setPageSize={setTransactionPageSize}
                    totalItems={totalTransactions}
                    currentPage={currentTransactionPage}
                  />
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
                <PaginationControls
                  currentPage={currentTransactionPage}
                  totalItems={totalTransactions}
                  pageSize={transactionPageSize}
                  setCurrentPage={setCurrentTransactionPage}
                />
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
                <form onSubmit={handleUserManageSearch} className="flex-1 mr-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="이름 또는 아이디로 검색..."
                      value={userManageSearchQuery}
                      onChange={(e) => setUserManageSearchQuery(e.target.value)}
                      className="max-w-sm"
                    />
                    <Button type="submit">검색</Button>
                    {isSearching && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={resetSearch}
                      >
                        초기화
                      </Button>
                    )}
                  </div>
                </form>
              </div>
              <PageSizeSelector
                pageSize={userPageSize}
                setPageSize={setUserPageSize}
                totalItems={users.length}
                currentPage={currentUserPage}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름(닉네임)</TableHead>
                    <TableHead>계좌번호</TableHead>
                    <TableHead>포인트</TableHead>
                    <TableHead>포인트 관리</TableHead>
                    <TableHead>딜러</TableHead>
                    <TableHead>관리자</TableHead>
                    <TableHead className="text-right">더보기</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <button
                          onClick={() => handleViewUserDetail(user.id)}
                          className="text-left hover:underline"
                        >
                          {user.name}
                          <br />
                          <span className="text-sm text-muted-foreground">
                            {user.nickname}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell>{user.bankAccount || "-"}</TableCell>
                      <TableCell>{user.points.toLocaleString()}P</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUserForPoints({
                              id: user.id,
                              name: user.name,
                              username: user.username,
                              points: user.points,
                              isDealer: user.isDealer,
                            });
                            setIsPointDialogOpen(true);
                          }}
                        >
                          <Wallet className="h-4 w-4 mr-2" />
                          관리
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.isDealer}
                          onCheckedChange={(checked) =>
                            toggleDealerStatus(user.id, checked)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.role === "ADMIN"}
                          onCheckedChange={(checked) =>
                            toggleAdminRole(user.id, checked)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                              <KeyRound className="h-4 w-4 mr-2" />
                              비밀번호 초기화
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteUser(user.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              사용자 삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationControls
                currentPage={currentUserPage}
                totalItems={users.length}
                pageSize={userPageSize}
                setCurrentPage={setCurrentUserPage}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isPointDialogOpen} onOpenChange={setIsPointDialogOpen}>
        <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-t-lg sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>포인트 관리</DialogTitle>
          </DialogHeader>
          {selectedUserForPoints && (
            <div className="space-y-4 p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-muted-foreground">사용자</div>
                  <div className="font-medium">{selectedUserForPoints.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedUserForPoints.username}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">현재 포인트</div>
                  <div className="font-bold">{selectedUserForPoints.points.toLocaleString()}P</div>
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
                  onClick={() => handlePointManageFromDialog('add')}
                >
                  충전하기
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handlePointManageFromDialog('subtract')}
                  disabled={!pointAmountForDialog || parseInt(pointAmountForDialog) <= 0 || parseInt(pointAmountForDialog) > selectedUserForPoints.points}
                >
                  차감하기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isUserDetailOpen} onOpenChange={setIsUserDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 상세 정보</DialogTitle>
          </DialogHeader>
          {selectedUserDetail && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>이름</Label>
                  <div className="font-medium">{selectedUserDetail.name}</div>
                </div>
                <div>
                  <Label>닉네임</Label>
                  <div className="font-medium">{selectedUserDetail.nickname}</div>
                </div>
                <div>
                  <Label>아이디</Label>
                  <div className="font-medium">{selectedUserDetail.username}</div>
                </div>
                <div>
                  <Label>연락처</Label>
                  <div className="font-medium">{selectedUserDetail.phone}</div>
                </div>
                <div className="col-span-2">
                  <Label>계좌번호</Label>
                  <div className="font-medium">{selectedUserDetail.bankAccount}</div>
                </div>
                <div>
                  <Label>가입일</Label>
                  <div className="font-medium">
                    {new Date(selectedUserDetail.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <Label>포인트</Label>
                  <div className="font-medium">{selectedUserDetail.points.toLocaleString()} P</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 