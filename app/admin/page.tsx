"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, ArrowLeft, Check, X, DollarSign, MoreHorizontal, Key, Trash2, UserPlus, Home, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [pointRequests, setPointRequests] = useState<PointRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [transactionType, setTransactionType] = useState("all");
  const [searchType, setSearchType] = useState("all");
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [pointAmount, setPointAmount] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // 사용자 인증 및 관리자 권한 체크
  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");
        
        if (!token || !storedUser) {
          router.push("/sign-in");
          return;
        }

        const user = JSON.parse(storedUser);
        
        // 관리자 권한 체크
        if (user.role !== "ADMIN") {
          toast({
            title: "접근 거부",
            description: "관리자만 접근할 수 있습니다.",
            variant: "destructive",
          });
          router.push("/");
          return;
        }

        fetchUsers();
        fetchPointRequests();
      } catch (error) {
        router.push("/sign-in");
      }
    };

    checkAuth();
  }, []);

  // 사용자 목록 가져오기
  const fetchUsers = async () => {
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
    } catch (error) {
      toast({
        title: "오류",
        description: "사용자 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const fetchPointRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/point-requests", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("포인트 요청 목록을 불러올 수 없습니다.");
      const data = await response.json();
      setPointRequests(data);
    } catch (error) {
      toast({
        title: "오류",
        description: "포인트 요청 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

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
    } catch (error) {
      toast({
        title: "오류",
        description: "권한 변경에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePointRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/point-requests/${requestId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "요청 처리에 실패했습니다.");
      }

      // 포인트 요청이 승인되고, 현재 로그인한 사용자의 요청인 경우 로컬 스토리지 업데이트
      if (status === 'approved' && data.user) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const currentUser = JSON.parse(storedUser);
          if (currentUser.id === data.user.id) {
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }
      }

      toast({
        title: "처리 완료",
        description: data.message,
      });

      // 데이터 새로고침
      await Promise.all([
        fetchPointRequests(),
        status === 'approved' && fetchUsers(),
      ].filter(Boolean));
    } catch (error) {
      console.error('포인트 요청 처리 에러:', error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "요청 처리에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
    } catch (error) {
      toast({
        title: "오류",
        description: "비밀번호 초기화에 실패했습니다.",
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
    } catch (error) {
      toast({
        title: "오류",
        description: "사용자 삭제에 실패했습니다.",
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

      const data = await response.json();
      
      toast({
        title: "딜러 상태 변경 완료",
        description: `사용자가 ${!currentStatus ? '딜러' : '일반'} 상태로 변경되었습니다.`,
      });

      // 사용자 목록 새로고침
      await fetchUsers();
    } catch (error) {
      toast({
        title: "오류",
        description: "딜러 상태 변경에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 포인트 내역 조회
  const fetchTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      });

      if (searchQuery) {
        queryParams.append('search', searchQuery);
        queryParams.append('searchType', searchType);
      }
      if (transactionType !== "all") queryParams.append('type', transactionType);

      const response = await fetch(`/api/admin/transactions?${queryParams}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "포인트 내역을 불러올 수 없습니다.");
      }

      const data = await response.json();
      setTransactions(data.transactions);
      setTotalTransactions(data.total);
    } catch (error) {
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "포인트 내역을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  useEffect(() => {
    if (searchQuery || transactionType !== "all") {
      const debounceTimer = setTimeout(() => {
        setCurrentPage(1);
        fetchTransactions();
      }, 300);

      return () => clearTimeout(debounceTimer);
    } else {
      fetchTransactions();
    }
  }, [searchQuery, transactionType]);

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, pageSize]);

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
        body: JSON.stringify({ action, amount }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "포인트 관리 중 오류가 발생했습니다.");
      }

      const data = await response.json();
      
      toast({
        title: "성공",
        description: data.message,
      });

      fetchUsers();
    } catch (error) {
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
                    <TableHead>사용자</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pointRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div>{request.user.name}</div>
                        <div className="text-sm text-muted-foreground">{request.user.username}</div>
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
                  ))}
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
                <Select value={searchType} onValueChange={setSearchType}>
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
                <Select value={transactionType} onValueChange={setTransactionType}>
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
                                  onClick={() => setSelectedUser({
                                    id: user.id,
                                    name: user.name,
                                    username: user.username,
                                    points: user.points,
                                  })}
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
                {selectedUser && (
                  <div className="border rounded-md p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedUser.username}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">현재 포인트</div>
                        <div className="text-xl font-bold">{selectedUser.points.toLocaleString()}P</div>
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
                            handleManagePoints(selectedUser.id, "add", parseInt(pointAmount));
                            setPointAmount("");
                            // 사용자 정보 업데이트
                            const updatedUser = users.find(u => u.id === selectedUser.id);
                            if (updatedUser) {
                              setSelectedUser({
                                ...selectedUser,
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
                            handleManagePoints(selectedUser.id, "subtract", parseInt(pointAmount));
                            setPointAmount("");
                            // 사용자 정보 업데이트
                            const updatedUser = users.find(u => u.id === selectedUser.id);
                            if (updatedUser) {
                              setSelectedUser({
                                ...selectedUser,
                                points: updatedUser.points,
                              });
                            }
                          }}
                          disabled={!pointAmount || parseInt(pointAmount) <= 0 || parseInt(pointAmount) > selectedUser.points}
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
                              onClick={() => handleManagePoints(user.id, "add", 0)}
                            >
                              <DollarSign className="mr-2 h-4 w-4" />
                              포인트 충전
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleManagePoints(user.id, "subtract", 0)}
                            >
                              <DollarSign className="mr-2 h-4 w-4" />
                              포인트 차감
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
    </div>
  );
} 