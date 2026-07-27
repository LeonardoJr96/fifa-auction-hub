import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest, toList } from "@/lib/api";
import type { Me, Transaction } from "@/types/api";

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiRequest<Me>("/users/me/"),
    enabled,
  });
}

export function useTransactions(enabled = true) {
  return useQuery({
    queryKey: ["payments", "me"],
    queryFn: async () => toList<Transaction>(await apiRequest<unknown>("/payments/me/")),
    enabled,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: {
      current_password: string;
      new_password: string;
      new_password_confirm: string;
    }) => apiRequest<unknown>("/users/change-password/", { method: "POST", body: payload }),
  });
}

export function usePayAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (auctionId: number | string) =>
      apiRequest<Transaction>(`/payments/auctions/${auctionId}/pay/`, { method: "POST" }),
    onSuccess: async (_data, auctionId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["payments", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["team", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["auction", String(auctionId)] }),
      ]);
    },
  });
}
