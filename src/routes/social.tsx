import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useCampaignConversation,
  useConversationMessages,
  useDirectConversation,
  useFriends,
  useSendFriendRequest,
  useSendMessage,
} from "@/features/social/hooks";
import { useAuth } from "@/features/auth/AuthContext";

export const Route = createFileRoute("/social")({ component: SocialPage });

function SocialPage() {
  const { isAuthenticated, user } = useAuth();
  const { data: friends = [], isLoading } = useFriends(isAuthenticated);
  const [targetUser, setTargetUser] = useState("");
  const [selectedUser, setSelectedUser] = useState<number>();
  const [campaignId, setCampaignId] = useState("");
  const [messageText, setMessageText] = useState("");
  const sendRequest = useSendFriendRequest();
  const sendMessage = useSendMessage();
  const direct = useDirectConversation(selectedUser);
  const campaign = useCampaignConversation(Number(campaignId) || undefined);
  const conversationId = direct.data?.id ?? campaign.data?.id;
  const messages = useConversationMessages(conversationId);

  if (!isAuthenticated) {
    return <main className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-3xl font-black">Comunidade</h1><p className="mt-2 text-muted-foreground">Entre na sua conta para conversar e adicionar amigos.</p></main>;
  }

  function submitFriend(event: React.FormEvent) {
    event.preventDefault();
    const id = Number(targetUser);
    if (!id || id === user?.id) return;
    sendRequest.mutate(id, { onSuccess: () => setTargetUser("") });
  }

  function submitMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!conversationId || !messageText.trim()) return;
    sendMessage.mutate({ conversationId, text: messageText.trim() }, { onSuccess: () => setMessageText("") });
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header><h1 className="text-3xl font-black">Comunidade</h1><p className="mt-1 text-muted-foreground">Amigos e conversas das suas campanhas.</p></header>
      <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="font-bold">Meus amigos</h2>
          <form onSubmit={submitFriend} className="flex gap-2">
            <input value={targetUser} onChange={(e) => setTargetUser(e.target.value)} inputMode="numeric" placeholder="ID do usuário" className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1 text-sm" />
            <button className="rounded bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Adicionar</button>
          </form>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : <div className="space-y-2">{friends.map((friend) => <button key={friend.id} onClick={() => setSelectedUser(friend.id)} className={`block w-full rounded px-3 py-2 text-left text-sm ${selectedUser === friend.id ? "bg-primary/20" : "hover:bg-accent"}`}>{friend.username} <span className="text-xs text-muted-foreground">#{friend.id}</span></button>)}</div>}
          <div className="border-t border-border pt-4"><label className="text-xs text-muted-foreground">Conversar na campanha</label><input value={campaignId} onChange={(e) => { setCampaignId(e.target.value); setSelectedUser(undefined); }} inputMode="numeric" placeholder="ID da campanha" className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm" /></div>
        </aside>
        <section className="flex min-h-[460px] flex-col rounded-xl border border-border bg-card p-5">
          <h2 className="border-b border-border pb-3 font-bold">{conversationId ? "Conversa" : "Selecione um amigo ou campanha"}</h2>
          <div className="flex-1 space-y-2 overflow-auto py-4">{messages.data?.messages.map((message) => <div key={message.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${message.sender === user?.id ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>{message.text}</div>)}{conversationId && !messages.data?.messages.length && <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>}</div>
          <form onSubmit={submitMessage} className="flex gap-2"><input disabled={!conversationId} value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Escreva uma mensagem..." className="min-w-0 flex-1 rounded border border-input bg-background px-3 py-2 text-sm" /><button disabled={!conversationId || sendMessage.isPending} className="rounded bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">Enviar</button></form>
        </section>
      </section>
    </main>
  );
}