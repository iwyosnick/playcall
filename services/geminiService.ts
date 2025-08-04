

import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AggregatedPlayer, ChatMessage, HeaderConfig, TradeAnalysis, TextAnalysis, RankingsApiResult, ExtractedPlayer, ClarificationRequest } from "../types";
import { getNormalizedPlayer, teamByeWeekMap } from './playerData';

// The user's environment is expected to have this API key.
// As per the requirements, we assume `process.env.API_KEY` is available.
if (!process.env.API_KEY) {
    // In a real-world scenario, you'd want a more robust way to handle this,
    // but for this project, we'll show an error to the user.
    throw new Error("API Key not found. Please ensure the API_KEY environment variable is set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = "gemini-2.5-flash";

// --- Data Extraction Logic ---

const extractionSchema = {
    type: Type.OBJECT,
    properties: {
        source: { type: Type.STRING, description: "A short, descriptive name for the data source (e.g., 'FantasyPros', 'Screenshot'). This must always be provided." },
        players: {
            type: Type.ARRAY,
            description: "An array of player objects. Should be empty if clarification is needed.",
            items: {
                type: Type.OBJECT,
                properties: {
                    rank: { type: Type.NUMBER, description: "The player's ranking number." },
                    name: { type: Type.STRING, description: "The player's full name, including suffixes like 'Jr.' or 'Sr.' if present." },
                    position: { type: Type.STRING, description: "The player's position (e.g., QB, RB, WR, TE)." },
                    team: { type: Type.STRING, description: "The player's NFL team abbreviation (e.g., 'SF', 'KC')." },
                },
                required: ['rank', 'name', 'position', 'team']
            }
        },
        needs_clarification: { type: Type.BOOLEAN, description: "Set to true if you need more information to process the content accurately. Otherwise, set to false." },
        questions: {
            type: Type.OBJECT,
            description: "If needs_clarification is true, an object of questions for the user. Omit questions that are not needed.",
            properties: {
                source: { type: Type.STRING, description: 'Question text for source name, if needed.' },
                draftType: { type: Type.STRING, description: 'Question text for draft type, if needed.' },
                scoringFormat: { type: Type.STRING, description: 'Question text for scoring format, if needed.' },
            },
        },
    },
    required: ['source', 'players', 'needs_clarification']
};

const getExtractionSystemInstruction = (userProvidedContext?: string): string => {
    let contextInstructions = "";

    if (userProvidedContext) {
        contextInstructions = `
The user has provided the following clarification, use it to accurately extract the data:
"${userProvidedContext}"
`;
    }

    return `You are an expert data extraction agent for fantasy football. Analyze the provided content (text and/or image) and extract player rankings, conforming to the provided JSON schema.
If an image is provided, it is likely a screenshot of rankings or a fantasy football team. Prioritize extracting data from the image if it contains a structured list.

CRITICAL INSTRUCTIONS:
1.  Extract the **rank**, **name**, **position**, and **team** for each player from either the text or the image.
2.  Be precise with player names. Include suffixes like 'Jr.', 'Sr.', 'II', etc.
3.  Even if the user provides additional text like a trade scenario, focus ONLY on extracting the numbered or structured list of player rankings.
4.  Your entire response MUST be a single JSON object that strictly follows the schema.

${!userProvidedContext ? `
-   If you have enough information, populate the 'players' array and set 'needs_clarification' to false.
-   If the content is ambiguous (e.g., unclear if it's for a Snake or Salary Cap draft, or if scoring format like PPR matters for the values), you MUST ask for clarification. To do this, leave the 'players' array empty, set 'needs_clarification' to true, and populate the 'questions' object with your questions.
` : `
- You have been provided with answers to previous questions. Use this context to perform the extraction. Do not ask for clarification again.
`}

${contextInstructions}
`;
};


export const extractRankings = async (pastedText: string, imageBase64?: string | null, imageMimeType?: string | null, userProvidedContext?: string): Promise<RankingsApiResult> => {
    try {
        const hasImage = !!(imageBase64 && imageMimeType);
        const systemInstruction = getExtractionSystemInstruction(userProvidedContext);

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
            requestParts.push({ text: pastedText });
        }
        
        if (requestParts.length === 0) {
            requestParts.push({ text: '(No content provided to analyze)' });
        }

        const response = await ai.models.generateContent({
            model,
            contents: { parts: requestParts },
            config: { 
                systemInstruction,
                responseMimeType: "application/json", 
                responseSchema: extractionSchema 
            }
        });

        const parsedData = JSON.parse(response.text);

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
        }).filter((p: ExtractedPlayer | null): p is ExtractedPlayer => p !== null);
        
        return { status: 'success', data: { source, players: processedPlayers } };
    } catch (error) {
        console.error("Error in extractRankings:", error);
        if (error instanceof Error) {
            // Provide a more user-friendly message for JSON parsing errors
            if (error.message.includes("Unexpected token")) {
                throw new Error("The AI returned an invalid response. Please try simplifying your input or check if it's formatted correctly.");
            }
        }
        throw error;
    }
};

const generateSimpleAiResponse = async (prompt: string, schema: any) => {
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema }
    });
    return JSON.parse(response.text);
};


export const generateTiers = async (players: AggregatedPlayer[]): Promise<AggregatedPlayer[]> => {
    const playerInfo = players.map(p => ({ name: p.name, rank: p.snakeRank, position: p.position }));
    const prompt = `Based on this list of fantasy football players and their average ranks, group them into positional tiers. Tiers represent a significant drop-off in expected value.
Return an array of objects, where each object has "name" and "aiTier" (a number) properties. Players not assigned a tier should be omitted.
Players: ${JSON.stringify(playerInfo)}`;
    
    const tierData = await generateSimpleAiResponse(prompt, {
        type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, aiTier: { type: Type.NUMBER } }, required: ['name', 'aiTier'] }
    });
    
    const tierMap = new Map((tierData as any[]).map(item => [item.name, item.aiTier]));
    const playersWithTiers = players.map(p => ({ ...p, aiTier: tierMap.get(p.name) ?? p.aiTier }));
    return playersWithTiers;
};

export const generateFaabBids = async (players: AggregatedPlayer[]): Promise<AggregatedPlayer[]> => {
    const playerInfo = players.filter(p => p.snakeRank > 120).map(p => ({ name: p.name, rank: p.snakeRank, position: p.position }));
    if (playerInfo.length === 0) return players;

    const prompt = `Here is a list of lower-ranked players, likely on the waiver wire. Based on their position and potential upside, recommend a FAAB bid for each as a percentage of a standard $100 budget. Only recommend bids for players with clear potential.
Return an array of objects, with "name" and "faabRec" (a number) properties. Players not recommended a bid should be omitted.
Players: ${JSON.stringify(playerInfo)}`;

    const faabData = await generateSimpleAiResponse(prompt, {
        type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, faabRec: { type: Type.NUMBER } }, required: ['name', 'faabRec'] }
    });

    const faabMap = new Map((faabData as any[]).map(item => [item.name, item.faabRec]));
    const playersWithFaab = players.map(p => ({ ...p, faabRec: faabMap.get(p.name) ?? p.faabRec }));
    return playersWithFaab;
};

const createAnalysisHandler = async (promptTemplate: string, text: string, schema: any): Promise<any> => {
    const prompt = promptTemplate.replace('${text}', text);
    return generateSimpleAiResponse(prompt, schema);
};

export const analyzeTrade = async (fullText: string): Promise<TradeAnalysis> => {
    const promptTemplate = `You are a fantasy football trade analyzer. The user has provided text that contains player rankings and a trade scenario. Identify the trade, use the rankings as a value baseline, analyze the trade, and provide a letter grade for the "My Team" side and concise reasoning. Text: --- \n${'${text}'}\n ---`;
    const schema = { type: Type.OBJECT, properties: { grade: { type: Type.STRING }, reasoning: { type: Type.STRING } }, required: ['grade', 'reasoning'] };
    return createAnalysisHandler(promptTemplate, fullText, schema);
};

export const getRosterSuggestions = async (fullText: string): Promise<TextAnalysis> => {
    const promptTemplate = `You are a fantasy football roster analyzer. The user has provided text containing rankings and their roster. Identify the roster, use rankings for value, and provide a concise analysis of strengths, weaknesses, and 1-2 actionable suggestions. Text: --- \n${'${text}'}\n ---`;
    const schema = { type: Type.OBJECT, properties: { advice: { type: Type.STRING } }, required: ['advice'] };
    return createAnalysisHandler(promptTemplate, fullText, schema);
};

const createSearchHandler = async (promptTemplate: string, players: AggregatedPlayer[]): Promise<TextAnalysis> => {
    const playerInfo = players.slice(0, 100).map(p => `${p.snakeRank}. ${p.name} (${p.position})`).join('\n');
    const prompt = promptTemplate.replace('${playerInfo}', playerInfo);

    const response: GenerateContentResponse = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources = groundingMetadata?.groundingChunks?.flatMap(chunk => 
        chunk.web?.uri ? [{ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri }] : []
    ) || [];

    return { advice: response.text, sources };
};

export const findSleepers = async (players: AggregatedPlayer[]): Promise<TextAnalysis> => {
    const promptTemplate = `Use Google Search to find the latest news, injury updates, and analysis on the provided list of players. Identify 3-5 potential sleepers (undervalued players with high upside). For each, provide a brief, one-sentence reasoning based on *up-to-date search information*. Format as a single string, with each player on a new line. Player List: --- \n${'${playerInfo}'}\n ---`;
    return createSearchHandler(promptTemplate, players);
};

export const findBusts = async (players: AggregatedPlayer[]): Promise<TextAnalysis> => {
    const promptTemplate = `Use Google Search to find the latest news, injury updates, and analysis on the provided list of players. Identify 3-5 potential busts (overvalued players with high risk). For each, provide a brief, one-sentence reasoning based on *up-to-date search information* (e.g., new injury, increased competition). Format as a single string, with each player on a new line. Player List: --- \n${'${playerInfo}'}\n ---`;
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
    
    const contents = history.map(h => ({ role: h.role, parts: [{ text: h.content }] }));

    const response = await ai.models.generateContent({
        model,
        contents,
        config: {
            systemInstruction: `You are PlayCall AI, a helpful fantasy football assistant. Use the provided context to answer the user's questions about their data. If the question is general, provide a helpful response. Be concise.\n\nCONTEXT:\n${context}`
        }
    });

    return response.text;
};