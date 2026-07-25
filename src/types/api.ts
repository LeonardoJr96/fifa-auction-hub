export interface Player {
  id: number;
  fifa_id: number;
  common_name: string;
  age: number;
  photo_url: string | null;
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
  | "OPEN"
  | "CLOSE"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "NO_WINNER";

export interface Auction {
  id: number;
  product: number | Product;
  pricing_mode: "player_value" | "manual";
  starting_price: string;
  current_price: string;
  min_increment: string;
  number_of_bids: number;
  status: AuctionStatus;
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
