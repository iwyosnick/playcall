

export type Source = string;

export interface ExtractedPlayer {
  rank: number;
  name: string;
  position: string;
  team: string;
  bye: number | undefined;
}

export interface ExtractionResult {
  source: Source;
  players: ExtractedPlayer[];
}

export interface AggregatedPlayer {
  name:string;
  position: string;
  team: string;
  bye?: number;
  ranks: { [source: string]: number };
  snakeRank: number;
  aiTier?: number | string;
  faabRec?: number;
  [key: string]: any; // Allow for flexible access in sorting/rendering
}

// ---- New Types for Advanced Features ----
export type PostLoadAction = 'tiers' | 'faab' | 'trade' | 'roster';
export type SecondaryAction = 'generate_tiers' | 'find_sleepers' | 'identify_busts';

export interface TradeAnalysis {
    grade: string;
    reasoning: string;
}

export interface TextAnalysis {
    advice: string;
    sources?: {
        uri: string;
        title: string;
    }[];
}


export type SortConfig = {
  key: string;
  direction: 'ascending' | 'descending';
};

export type HeaderConfig = {
    key: string;
    label: string;
    sortable: boolean;
};

export type ClarificationRequest = {
    [key: string]: string; // e.g., { source: "Please specify...", draftType: "..." }
};

// --- API Result Types ---
export type RankingsApiResult = 
    | { status: 'success'; data: ExtractionResult }
    | { status: 'clarification_needed'; questions: ClarificationRequest };

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  suggestions?: string[];
}