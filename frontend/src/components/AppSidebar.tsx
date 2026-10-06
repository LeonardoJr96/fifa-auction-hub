import { Link, useRouterState } from "@tanstack/react-router";
import {
  CircleDollarSign,
  Film,
  Gauge,
  LogIn,
  LogOut,
  Shield,
  Shirt,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";

import { useAuth } from "@/features/auth/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

const publicGroups = [
  {
    label: "Principal",
    items: [
      { title: "Leilões", to: "/" as const, icon: Gauge, exact: true },
      { title: "Competições", to: "/competitions" as const, icon: Trophy, exact: false },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { title: "Jogadores", to: "/players" as const, icon: UsersRound, exact: false },
      { title: "Vídeos", to: "/videos" as const, icon: Film, exact: false },
    ],
  },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (router) => router.location.pathname });
  const { isAuthenticated, isStaff, user, logout } = useAuth();
  const active = (to: string, exact = false) => exact ? pathname === to : pathname.startsWith(to);

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <Link to="/" onClick={() => setOpenMobile(false)} className="flex h-11 items-center gap-3 overflow-hidden px-1">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary font-display text-lg font-black text-primary-foreground">R</span>
          {!collapsed ? (
            <span className="font-display text-[17px] font-bold text-sidebar-foreground">
              Reverse<span className="text-live">Draft</span>
            </span>
          ) : null}
        </Link>
      </SidebarHeader>
      <SidebarContent className="py-3">
        {publicGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="font-display text-[10px] font-bold uppercase tracking-[0.16em]">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active(item.to, item.exact)} tooltip={item.title} size="lg">
                      <Link to={item.to} onClick={() => setOpenMobile(false)}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {isAuthenticated ? (
          <SidebarGroup>
            <SidebarGroupLabel className="font-display text-[10px] font-bold uppercase tracking-[0.16em]">Meu clube</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={active("/bolsa")} tooltip="Bolsa" size="lg">
                    <Link to="/bolsa" onClick={() => setOpenMobile(false)}><Shirt /><span>Bolsa</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={active("/me")} tooltip="Minha conta" size="lg">
                    <Link to="/me" onClick={() => setOpenMobile(false)}><UserRound /><span>Minha conta</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {isStaff ? (
          <SidebarGroup>
            <SidebarGroupLabel className="font-display text-[10px] font-bold uppercase tracking-[0.16em]">Sistema</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={active("/admin")} tooltip="Administração" size="lg">
                    <Link to="/admin" onClick={() => setOpenMobile(false)}><Shield /><span>Administração</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            {isAuthenticated ? (
              <SidebarMenuButton tooltip={`Sair de ${user?.username ?? "sua conta"}`} size="lg" onClick={logout}>
                <LogOut /><span className="truncate">Sair · {user?.username}</span>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton asChild tooltip="Fazer login" size="lg">
                <Link to="/login" onClick={() => setOpenMobile(false)}><LogIn /><span>Fazer login</span></Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}