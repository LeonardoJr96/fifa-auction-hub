import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiListAll, apiRequest } from "@/lib/api";
import type { Conversation, ConversationMessages, Friend, Friendship, Message } from "@/types/api";

export function useFriends(enabled = true) {
  return useQuery({
    queryKey: ["social", "friends"],
    queryFn: () => apiListAll<Friend>("/social/friends/"),
    enabled,
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (addresseeId: number) =>
      apiRequest<Friendship>("/social/friend-requests/", { method: "POST", body: { addressee_id: addresseeId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["social", "friends"] }),
  });
}

export function useRespondFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, accepted }: { requestId: number; accepted: boolean }) =>
      apiRequest<Friendship>(`/social/friend-requests/${requestId}/respond/`, {
        method: "POST",
        body: { accepted },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["social", "friends"] }),
  });
}

export function useDirectConversation(userId?: number) {
  return useQuery({
    queryKey: ["social", "direct-conversation", userId],
    queryFn: () => apiRequest<Conversation>(`/social/conversations/direct/${userId}/`),
    enabled: userId !== undefined,
  });
}

export function useCampaignConversation(campaignId?: number) {
  return useQuery({
    queryKey: ["social", "campaign-conversation", campaignId],
    queryFn: () => apiRequest<Conversation>(`/social/conversations/campaign/${campaignId}/`),
    enabled: campaignId !== undefined,
  });
}

export function useConversationMessages(conversationId?: number, beforeId?: number) {
  return useQuery({
    queryKey: ["social", "messages", conversationId, beforeId],
    queryFn: () =>
      apiRequest<ConversationMessages>(
        `/social/conversations/${conversationId}/messages/${beforeId ? `?before_id=${beforeId}` : ""}`,
      ),
    enabled: conversationId !== undefined,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, text }: { conversationId: number; text: string }) =>
      apiRequest<Message>(`/social/conversations/${conversationId}/messages/`, {
        method: "POST",
        body: { text },
      }),
    onSuccess: (_message, { conversationId }) =>
      queryClient.invalidateQueries({ queryKey: ["social", "messages", conversationId] }),
  });
}
