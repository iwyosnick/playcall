

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AggregatedPlayer, ChatMessage, HeaderConfig, TradeAnalysis, TextAnalysis, RankingsApiResult, ExtractedPlayer, ClarificationRequest } from "../types";
import { getNormalizedPlayer, teamByeWeekMap } from './playerData';

// The user's environment is expected to have this API key.
// As per the requirements, we assume `process.env.API_KEY` is available.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
if (!apiKey) {
    // In a real-world scenario, you'd want a more robust way to handle this,
    // but for this project, we'll show an error to the user.
    throw new Error("API Key not found. Please ensure the VITE_GEMINI_API_KEY environment variable is set.");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// --- Data Extraction Logic ---



export const extractRankings = async (pastedText: string, imageBase64?: string | null, imageMimeType?: string | null, userProvidedContext?: string): Promise<RankingsApiResult> => {
    try {
        const hasImage = !!(imageBase64 && imageMimeType);
        
        // Use progressive content processing for better results
        const { cleanedText, detectedFormat, processingPhase } = await progressiveContentProcessing(pastedText);

        const prompt = `You are an expert data extraction agent for fantasy football. Extract ONLY the player rankings from the provided content.

DETECTED FORMAT: ${detectedFormat}
PROCESSING PHASE: ${processingPhase}

CRITICAL INSTRUCTIONS:
1. Focus ONLY on numbered player rankings in the detected format
2. Ignore all other text, ads, navigation, etc.
3. Extract rank, name, position, and team for each player
4. Your response MUST be valid JSON with this exact structure:

{
  "source": "Fantasy Football Rankings",
  "players": [
    {
      "rank": 1,
      "name": "Player Name",
      "position": "QB",
      "team": "SF"
    }
  ],
  "needs_clarification": false
}

If you cannot find clear player rankings, set "needs_clarification" to true and leave players array empty.

Content to analyze:
${cleanedText || '(No text provided)'}

${userProvidedContext ? `Additional context: ${userProvidedContext}` : ''}`;

        const requestParts: any[] = [];

        if (hasImage) {
            const base64Data = imageBase64.split(',')[1];
            if (base64Data) {
                requestParts.push({
                    inlineData: {
                        mimeType: imageMimeType,
                        data: base64Data,
                    },
                });
            }
        }
        
        if (pastedText && pastedText.trim()) {
            requestParts.push({ text: prompt });
        } else if (hasImage) {
            requestParts.push({ text: prompt });
        } else {
            throw new Error("No content provided to analyze.");
        }

        const result = await model.generateContent(requestParts);
        const response = await result.response;
        const text = response.text();

        // Try to extract JSON from the response
        let jsonStart = text.indexOf('{');
        let jsonEnd = text.lastIndexOf('}');
        
        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error("AI response does not contain valid JSON. Please try again.");
        }
        
        const jsonText = text.substring(jsonStart, jsonEnd + 1);
        
        let parsedData;
        try {
            parsedData = JSON.parse(jsonText);
        } catch (parseError) {
            console.error("JSON parse error:", parseError);
            console.error("Raw JSON text:", jsonText);
            
            // Try to repair the JSON
            const repairedJson = repairJson(jsonText);
            
            try {
                parsedData = JSON.parse(repairedJson);
            } catch (secondError) {
                const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
                throw new Error(`AI returned malformed JSON. Please try again with simpler input. Error: ${errorMessage}`);
            }
        }

        if (parsedData.needs_clarification && !userProvidedContext) {
            const questions: ClarificationRequest = {};
            if (parsedData.questions) {
                for (const [key, value] of Object.entries(parsedData.questions)) {
                    if (value) questions[key] = value as string;
                }
            }
            if (Object.keys(questions).length > 0) {
                return { status: 'clarification_needed', questions };
            }
        }
        
        const { source, players: rawPlayers } = parsedData;
        if (!source || !Array.isArray(rawPlayers)) {
            throw new Error("AI response was malformed or missing data.");
        }
        if (userProvidedContext && rawPlayers.length === 0) {
            throw new Error("The AI still could not extract player data, even with the provided details.");
        }

        const processedPlayers: ExtractedPlayer[] = rawPlayers.map((p: any) => {
            const name = p.name?.trim();
            if (!name || typeof p.rank !== 'number' || !p.position || !p.team) return null;
            const masterPlayer = getNormalizedPlayer(name, p.position.trim());
            if (masterPlayer) {
                return { rank: p.rank, name: masterPlayer.name, position: masterPlayer.position, team: masterPlayer.team, bye: teamByeWeekMap.get(masterPlayer.team) };
            } else {
                const teamAbbr = p.team.trim().toUpperCase();
                return { rank: p.rank, name: name, position: p.position.trim(), team: teamAbbr, bye: teamByeWeekMap.get(teamAbbr) };
            }
        }).filter((p): p is ExtractedPlayer => p !== null);
        
        return { status: 'success', data: { source, players: processedPlayers } };
    } catch (error) {
        console.error("Error in extractRankings:", error);
        if (error instanceof Error) {
            if (error.message.includes("Unexpected token")) {
                throw new Error("The AI returned an invalid response. Please try simplifying your input or check if it's formatted correctly.");
            }
        }
        throw error;
    }
};

// Progressive content processing with multi-format detection
const progressiveContentProcessing = async (text: string): Promise<{ cleanedText: string, detectedFormat: string, processingPhase: string }> => {
    if (!text) return { cleanedText: '', detectedFormat: 'No text', processingPhase: 'None' };
    
    // Phase 1: Quick scan (15K chars, <3s target)
    console.log('Phase 1: Quick scan (15K characters)...');
    const quickResult = await processContentChunk(text, 0, 15000);
    if (quickResult.playerCount >= 250) {
        return {
            cleanedText: quickResult.cleanedText,
            detectedFormat: quickResult.detectedFormat,
            processingPhase: 'Quick Scan - Found 250+ players'
        };
    }
    
    // Phase 2: Extended scan (40K chars, <6s target)
    console.log('Phase 2: Extended scan (40K characters)...');
    const extendedResult = await processContentChunk(text, 0, 40000);
    if (extendedResult.playerCount >= 350) {
        return {
            cleanedText: extendedResult.cleanedText,
            detectedFormat: extendedResult.detectedFormat,
            processingPhase: 'Extended Scan - Found 350+ players'
        };
    }
    
    // Phase 3: Full processing (<10s total target)
    console.log('Phase 3: Full processing...');
    const fullResult = await processContentChunk(text, 0, text.length);
    return {
        cleanedText: fullResult.cleanedText,
        detectedFormat: fullResult.detectedFormat,
        processingPhase: 'Full Processing - Complete data'
    };
};

// Process content chunk with multi-format detection
const processContentChunk = async (text: string, start: number, end: number): Promise<{ cleanedText: string, detectedFormat: string, playerCount: number }> => {
    const chunk = text.substring(start, end);
    
    // Clean the content
    let cleaned = cleanBasicContent(chunk);
    
    // Detect format and extract players
    const formatDetection = detectRankingFormat(cleaned);
    
    // If we found a good format with many players, use it
    if (formatDetection.playerCount >= 50) {
        return {
            cleanedText: formatDetection.extractedText,
            detectedFormat: formatDetection.format,
            playerCount: formatDetection.playerCount
        };
    }
    
    // Otherwise, return cleaned content for AI processing
    return {
        cleanedText: cleaned.length > 50000 ? cleaned.substring(0, 50000) + '...' : cleaned,
        detectedFormat: 'Mixed/Unknown - Using AI extraction',
        playerCount: 0
    };
};

// Detect ranking format and extract players
const detectRankingFormat = (text: string): { format: string, playerCount: number, extractedText: string } => {
    // ESPN Complex style: "1. (WR1) Player Name, CIN $57 10 8" - HIGHEST PRIORITY
    const espnComplexPattern = /(\d+\.\s*\([A-Z]+\d+\)\s*[^,]+,\s*[A-Z]{2,3}\s*\$?\d*\s*\d*\s*\d*)/g;
    const espnComplexMatches = text.match(espnComplexPattern);
    
    // ESPN/PDF style: "1. Player Name QB SF" (fallback)
    const espnPattern = /(\d+\.\s*[A-Za-z\s\.'-]+(?:Jr\.|Sr\.|II|III|IV|V)?\s*[A-Z]{2,3}\s*[A-Z]{2,3})/g;
    const espnMatches = text.match(espnPattern);
    
    // CSV style: "Rank,Player,Pos,Team"
    const csvPattern = /(\d+),([^,]+),([^,]+),([^,\n]+)/g;
    const csvMatches = text.match(csvPattern);
    
    // Website style: "Player | QB | SF"
    const websitePattern = /([A-Za-z\s\.'-]+(?:Jr\.|Sr\.|II|III|IV|V)?)\s*\|\s*([A-Z]{2,3})\s*\|\s*([A-Z]{2,3})/g;
    const websiteMatches = text.match(websitePattern);
    
    // Alternative: "QB Player Name SF"
    const altPattern = /([A-Z]{2,3})\s+([A-Za-z\s\.'-]+(?:Jr\.|Sr\.|II|III|IV|V)?)\s+([A-Z]{2,3})/g;
    const altMatches = text.match(altPattern);
    
    // Find the format with the most matches - ESPN Complex gets priority
    const results = [
        { format: 'ESPN Complex Style', count: espnComplexMatches?.length || 0, matches: espnComplexMatches, pattern: espnComplexPattern },
        { format: 'ESPN/PDF Style', count: espnMatches?.length || 0, matches: espnMatches, pattern: espnPattern },
        { format: 'CSV Style', count: csvMatches?.length || 0, matches: csvMatches, pattern: csvPattern },
        { format: 'Website Style', count: websiteMatches?.length || 0, matches: websiteMatches, pattern: websitePattern },
        { format: 'Alternative Style', count: altMatches?.length || 0, matches: altMatches, pattern: altPattern }
    ];
    
    const bestFormat = results.reduce((best, current) => current.count > best.count ? current : best);
    
    if (bestFormat.count >= 50) {
        return {
            format: bestFormat.format,
            playerCount: bestFormat.count,
            extractedText: bestFormat.matches?.join('\n') || text
        };
    }
    
    return {
        format: 'Mixed/Unknown',
        playerCount: 0,
        extractedText: text
    };
};

// Basic content cleaning
const cleanBasicContent = (text: string): string => {
    if (!text) return '';
    
    // Remove HTML tags
    let cleaned = text.replace(/<[^>]*>/g, '');
    
    // Remove extra whitespace and normalize
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Remove common website artifacts
    cleaned = cleaned.replace(/Cookie Policy|Privacy Policy|Terms of Service|©.*?\./gi, '');
    cleaned = cleaned.replace(/Loading\.\.\.|Please wait\.\.\./gi, '');
    
    return cleaned;
};

// Helper function to repair malformed JSON
const repairJson = (jsonText: string): string => {
    let fixedJson = jsonText;
    
    // Fix trailing commas
    fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix missing quotes around property names
    fixedJson = fixedJson.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    // Fix missing quotes around string values
    fixedJson = fixedJson.replace(/:\s*([a-zA-Z][a-zA-Z0-9\s\.'-]+)(\s*[,}])/g, ':"$1"$2');
    
    // Fix unescaped quotes in strings
    fixedJson = fixedJson.replace(/"([^"]*)"([^"]*)"([^"]*)"/g, '"$1$2$3"');
    
    // Try to balance brackets and braces
    let bracketCount = 0;
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < fixedJson.length; i++) {
        const char = fixedJson[i];
        
        if (escapeNext) {
            escapeNext = false;
            continue;
        }
        
        if (char === '\\') {
            escapeNext = true;
            continue;
        }
        
        if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
        }
        
        if (!inString) {
            if (char === '[') bracketCount++;
            if (char === ']') bracketCount--;
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
        }
    }
    
    // Add missing closing brackets/braces
    while (bracketCount > 0) {
        fixedJson += ']';
        bracketCount--;
    }
    while (braceCount > 0) {
        fixedJson += '}';
        braceCount--;
    }
    
    return fixedJson;
};

const generateSimpleAiResponse = async (prompt: string) => {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to extract JSON from the response
    let jsonStart = text.indexOf('[');
    let jsonEnd = text.lastIndexOf(']');
    
    if (jsonStart === -1 || jsonEnd === -1) {
        // Try object format
        jsonStart = text.indexOf('{');
        jsonEnd = text.lastIndexOf('}');
    }
    
    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("AI response does not contain valid JSON. Please try again.");
    }
    
    const jsonText = text.substring(jsonStart, jsonEnd + 1);
    
    try {
        return JSON.parse(jsonText);
    } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Raw JSON text:", jsonText);
        
        // Try to repair the JSON
        const repairedJson = repairJson(jsonText);
        
        try {
            return JSON.parse(repairedJson);
        } catch (secondError) {
            const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
            throw new Error(`AI returned malformed JSON. Please try again with simpler input. Error: ${errorMessage}`);
        }
    }
};

export const generateTiers = async (players: AggregatedPlayer[]): Promise<AggregatedPlayer[]> => {
    const playerInfo = players.map(p => ({ name: p.name, rank: p.snakeRank, position: p.position }));
    const prompt = `Based on this list of fantasy football players and their average ranks, group them into positional tiers. Tiers represent a significant drop-off in expected value.

Return ONLY a valid JSON array, where each object has "name" and "aiTier" (a number) properties. Players not assigned a tier should be omitted.

Example response format:
[
  {"name": "Player Name", "aiTier": 1},
  {"name": "Another Player", "aiTier": 2}
]

Players: ${JSON.stringify(playerInfo)}`;
    
    const tierData = await generateSimpleAiResponse(prompt);
    
    const tierMap = new Map((tierData as any[]).map(item => [item.name, item.aiTier]));
    const playersWithTiers = players.map(p => ({ ...p, aiTier: tierMap.get(p.name) ?? p.aiTier }));
    return playersWithTiers;
};

export const generateFaabBids = async (players: AggregatedPlayer[]): Promise<AggregatedPlayer[]> => {
    const playerInfo = players.filter(p => p.snakeRank > 120).map(p => ({ name: p.name, rank: p.snakeRank, position: p.position }));
    if (playerInfo.length === 0) return players;

    const prompt = `Here is a list of lower-ranked players, likely on the waiver wire. Based on their position and potential upside, recommend a FAAB bid for each as a percentage of a standard $100 budget. Only recommend bids for players with clear potential.

Return ONLY a valid JSON array, with "name" and "faabRec" (a number) properties. Players not recommended a bid should be omitted.

Example response format:
[
  {"name": "Player Name", "faabRec": 15},
  {"name": "Another Player", "faabRec": 8}
]

Players: ${JSON.stringify(playerInfo)}`;

    const faabData = await generateSimpleAiResponse(prompt);

    const faabMap = new Map((faabData as any[]).map(item => [item.name, item.faabRec]));
    const playersWithFaab = players.map(p => ({ ...p, faabRec: faabMap.get(p.name) ?? p.faabRec }));
    return playersWithFaab;
};

const createAnalysisHandler = async (promptTemplate: string, text: string): Promise<any> => {
    const prompt = promptTemplate.replace('${text}', text);
    return generateSimpleAiResponse(prompt);
};

export const analyzeTrade = async (fullText: string): Promise<TradeAnalysis> => {
    const promptTemplate = `You are a fantasy football trade analyzer. The user has provided text that contains player rankings and a trade scenario. Identify the trade, use the rankings as a value baseline, analyze the trade, and provide a letter grade for the "My Team" side and concise reasoning.

Return ONLY a valid JSON object with this exact structure:
{
  "grade": "A",
  "reasoning": "Brief explanation of the trade analysis"
}

Text: --- \n${'${text}'}\n ---`;
    return createAnalysisHandler(promptTemplate, fullText);
};

export const getRosterSuggestions = async (fullText: string): Promise<TextAnalysis> => {
    const promptTemplate = `You are a fantasy football roster analyzer. The user has provided text containing rankings and their roster. Identify the roster, use rankings for value, and provide a concise analysis of strengths, weaknesses, and 1-2 actionable suggestions.

Return ONLY a valid JSON object with this exact structure:
{
  "advice": "Your analysis and suggestions here"
}

Text: --- \n${'${text}'}\n ---`;
    return createAnalysisHandler(promptTemplate, fullText);
};

const createSearchHandler = async (promptTemplate: string, players: AggregatedPlayer[]): Promise<TextAnalysis> => {
    const playerInfo = players.slice(0, 100).map(p => `${p.snakeRank}. ${p.name} (${p.position})`).join('\n');
    const prompt = promptTemplate.replace('${playerInfo}', playerInfo);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Note: Google Search integration is not available in the current API version
    // For now, we'll return the response without sources
    return { advice: text, sources: [] };
};

export const findSleepers = async (players: AggregatedPlayer[]): Promise<TextAnalysis> => {
    const promptTemplate = `Use Google Search to find the latest news, injury updates, and analysis on the provided list of players. Identify 3-5 potential sleepers (undervalued players with high upside). For each, provide a brief, one-sentence reasoning based on *up-to-date search information*. Format as a single string, with each player on a new line. Player List: --- \n${'${text}'}\n ---`;
    return createSearchHandler(promptTemplate, players);
};

export const findBusts = async (players: AggregatedPlayer[]): Promise<TextAnalysis> => {
    const promptTemplate = `Use Google Search to find the latest news, injury updates, and analysis on the provided list of players. Identify 3-5 potential busts (overvalued players with high risk). For each, provide a brief, one-sentence reasoning based on *up-to-date search information* (e.g., new injury, increased competition). Format as a single string, with each player on a new line. Player List: --- \n${'${text}'}\n ---`;
    return createSearchHandler(promptTemplate, players);
};

export const getChatResponse = async (history: ChatMessage[], players: AggregatedPlayer[], headers: HeaderConfig[]): Promise<string> => {
    let context = "The user has not loaded any data yet. Answer their questions generally about fantasy football.";
    if (players.length > 0) {
        const tableHeaders = headers.map(h => h.label).join(' | ');
        const tableBody = players.slice(0, 50).map(p => {
            return headers.map(h => {
                const KNOWN_PLAYER_PROPS = ['snakeRank', 'name', 'position', 'team', 'bye', 'aiTier', 'faabRec'];
                const isRankKey = !KNOWN_PLAYER_PROPS.includes(h.key);
                let value = isRankKey ? p.ranks[h.key] : p[h.key as keyof typeof p];
                if (h.key === 'snakeRank' && typeof value === 'number') return value.toFixed(1);
                return value ?? '-';
            }).join(' | ');
        }).join('\n');
        context = `Here is the current data table the user is viewing (top 50 players shown):\n${tableHeaders}\n${tableBody}`;
    }
    
    const systemPrompt = `You are PlayCall AI, a helpful fantasy football assistant. Use the provided context to answer the user's questions about their data. If the question is general, provide a helpful response. Be concise.\n\nCONTEXT:\n${context}`;
    
    const fullPrompt = `${systemPrompt}\n\nUser: ${history[history.length - 1]?.content || 'Hello'}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
};