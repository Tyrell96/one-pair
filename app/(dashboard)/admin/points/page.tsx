"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PointRequest {
  id: string;
  userId: string;
  userName: string;
  type: "charge" | "withdraw";
  amount: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface PointTransaction {
  id: string;
  userId: string;
  userName: string;
  type: "충전" | "사용" | "분배";
  amount: number;
  date: string;
}

export default function PointManagementPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [pointRequests, setPointRequests] = useState<PointRequest[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);

  const fetchPointRequests = useCallback(async () => {
    try {
      const response = await fetch("/api/point-requests");
      if (!response.ok) throw new Error("포인트 요청을 불러올 수 없습니다.");
      const data = await response.json();
      setPointRequests(data.requests);
    } catch (error) {
      toast({
        title: "오류",
        description: "포인트 요청을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch("/api/transactions");
      if (!response.ok) throw new Error("거래 내역을 불러올 수 없습니다.");
      const data = await response.json();
      setTransactions(data.transactions);
    } catch (error) {
      toast({
        title: "오류",
        description: "거래 내역을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchPointRequests();
    fetchTransactions();
  }, [fetchPointRequests, fetchTransactions]);

  const handleRequestAction = async (requestId: string, action: "approve" | "reject") => {
    try {
      const response = await fetch(`/api/point-requests/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) throw new Error("요청 처리에 실패했습니다.");

      toast({
        title: "성공",
        description: `요청이 ${action === "approve" ? "승인" : "거절"}되었습니다.`,
      });

      fetchPointRequests();
      fetchTransactions();
    } catch (error) {
      toast({
        title: "오류",
        description: "요청 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">포인트 요청</TabsTrigger>
          <TabsTrigger value="transactions">거래 내역</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>포인트 요청 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2 mb-4">
                <Input
                  placeholder="사용자 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <Button>
                  <Search className="w-4 h-4 mr-2" />
                  검색
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>요청일</TableHead>
                    <TableHead>사용자</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pointRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{request.userName}</TableCell>
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
                              size="sm"
                              variant="outline"
                              onClick={() => handleRequestAction(request.id, "approve")}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRequestAction(request.id, "reject")}
                            >
                              <X className="w-4 h-4" />
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
              <CardTitle>거래 내역</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2 mb-4">
                <Input
                  placeholder="사용자 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <Button>
                  <Search className="w-4 h-4 mr-2" />
                  검색
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>사용자</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell>{transaction.userName}</TableCell>
                      <TableCell>{transaction.type}</TableCell>
                      <TableCell className={transaction.amount < 0 ? "text-red-500" : "text-green-500"}>
                        {transaction.amount.toLocaleString()}P
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