

export type Source = string;

// Data Type Detection Types
export type DraftType = 'snake' | 'salary_cap' | 'mixed' | 'unknown';

export interface DataTypeDetection {
  detectedType: DraftType;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  hasSnakeRankings: boolean;
  hasSalaryCapValues: boolean;
  needsUserChoice: boolean;
}

export interface ExtractedPlayer {
  rank: number;
  name: string;
  position: string;
  team: string;
  bye: number | undefined;
  // Add support for salary cap values
  salaryCapValue?: number;
  auctionValue?: number;
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
    | { status: 'success'; data: ExtractionResult; dataType?: DataTypeDetection }
    | { status: 'clarification_needed'; questions: ClarificationRequest; dataType?: DataTypeDetection }
    | { status: 'data_type_choice_needed'; dataType: DataTypeDetection; extractedData: any };

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  suggestions?: string[];
}