export interface Player {
  id: number;
  fifa_id: number;
  common_name: string;
  age: number;
  photo_url: string | null;
  photo_data_uri?: string | null;
  photo_base64?: string | null;
  price: number;
  positions?: string[];
  best_position?: string;
  pac: number | null;
  sho: number | null;
  pas: number | null;
  dri: number | null;
  def_rating: number | null;
  phy: number | null;
  overall_rating: number;
  potential: number;
  [key: string]: unknown;
}

export interface ProductImage {
  id: number;
  image: string;
  is_cover: boolean;
  order: number;
}

export interface Product {
  id: number;
  player: Player;
  title: string;
  price: string;
  category: string;
  quantity: number;
  images: ProductImage[];
}

export type AuctionStatus =
  "OPEN" | "CLOSE" | "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "NO_WINNER";

export interface Auction {
  id: number;
  product: number | Product;
  pricing_mode: "player_value" | "manual";
  starting_price: string | number;
  current_price: string | number;
  min_increment: string | number;
  number_of_bids: number;
  /** A API pode devolver minúsculo ("open"); normalize com auctionStatus(). */
  status: AuctionStatus | Lowercase<AuctionStatus>;
  time_starting: string;
  time_ending: string;
  winner: number | null;
  payment_deadline: string | null;
}

export interface Bid {
  id: number;
  auction: number;
  price: string;
  bid_time: string;
  user?: number;
  /** Nome de quem deu o lance (a API pode omitir no lance recém-criado pelo próprio usuário). */
  username?: string;
}

export type Formation = "4-3-3" | "4-4-2" | "3-5-2" | "4-2-3-1";

export interface TeamSlot {
  slot_code: string;
  player: Player | null;
}

export interface FormationSlotLayout {
  slot_code: string;
  label: string;
  x: number;
  y: number;
  order: number;
}

export interface Team {
  id: number;
  name: string;
  formation: Formation;
  slots: TeamSlot[];
  formation_layout: FormationSlotLayout[];
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface BidHistoryItem {
  id: number;
  auction: number;
  product_title: string;
  price: string;
  bid_time: string;
  status: string;
}

export interface Me {
  id: number;
  username: string;
  email: string;
  cpf: string | null;
  birth_date: string | null;
  cellphone: string | null;
  address: string | null;
  town: string | null;
  post_code: string | null;
  country: string | null;
  /** Créditos de lance (cada lance consome 1). */
  lance_credits: number;
  bid_history: BidHistoryItem[];
}

/** Campos editáveis via PATCH /users/me/. */
export interface MeUpdate {
  cellphone?: string;
  address?: string;
  town?: string;
  post_code?: string;
  country?: string;
}


export type TransactionType = "auction_payment" | "balance_recharge" | "refund" | "direct_purchase";

export interface Transaction {
  id: number;
  type: TransactionType;
  status: string;
  amount: string;
  balance_after: string;
  auction: number | null;
  created_at: string;
}

export interface PlayerRole {
  role: string;
  position: string;
  focuses: string[];
}

export type TransferPolicy = "always_allowed" | "market_window_only";

export interface Campaign {
  id: number;
  name: string;
  is_active: boolean;
  min_roster_size: number;
  max_roster_size: number;
  matches_per_market_cycle: number;
  matches_played_since_last_market: number;
  transfer_policy: TransferPolicy;
  created_at: string;
  /** Campos opcionais enquanto versões antigas da API ainda não os expõem. */
  is_member?: boolean;
  is_admin?: boolean;
}

export type MarketWindowMode = "auction" | "market" | "hybrid";

export interface MarketWindow {
  id: number;
  campaign: number;
  name: string;
  is_open: boolean;
  starts_at: string | null;
  ends_at: string | null;
  mode: MarketWindowMode;
  player_count: number | null;
  random_selection: boolean;
}

export type ListingType = "auction" | "direct" | "hybrid";

export interface MarketListing {
  id: number;
  market_window: number;
  player: number | Player;
  seller: number;
  listing_type: ListingType;
  price: string | null;
  is_active: boolean;
  created_at: string;
  auction: number | null;
}

export type TransferStatus = "pending" | "accepted" | "rejected";

export interface Transfer {
  id: number;
  campaign: number;
  requester: number;
  receiver: number;
  offered_players: number[];
  requested_players: number[];
  status: TransferStatus;
  created_at: string;
}

export type CompetitionType = "league" | "cup";

export interface Competition {
  id: number;
  name: string;
  competition_type: CompetitionType;
  is_active: boolean;
  campaign: number | null;
  created_at: string;
}

export interface MatchPlayerStat {
  id: number;
  match: number;
  player: number;
  goals: number;
  assists: number;
}

export interface Match {
  id: number;
  competition: number;
  home_team: number | Team;
  away_team: number | Team;
  home_score: number;
  away_score: number;
  played_at: string;
  player_stats?: MatchPlayerStat[];
}
export interface FormationLayout extends FormationSlotLayout {
  id?: number;
}

export interface Friend {
  id: number;
  username: string;
}

export interface Friendship {
  id: number;
  requester: number;
  addressee: number;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  responded_at: string | null;
}

export interface Conversation {
  id: number;
  type: "direct" | "campaign";
  campaign: number | null;
  participants: number[];
  created_at: string;
}

export interface Message {
  id: number;
  conversation: number;
  sender: number;
  text: string;
  created_at: string;
}


export interface ConversationMessages {
  messages: Message[];
  has_more: boolean;
}
