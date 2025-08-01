

import React, { useState, useCallback, useMemo } from 'react';
import { AggregatedPlayer, ExtractedPlayer, ClarificationRequest, ClarificationAnswers, SortConfig, HeaderConfig, ChatMessage, PostLoadAction, TradeAnalysis, TextAnalysis, SecondaryAction } from './types';
import { extractRankings, getChatResponse, generateTiers, generateFaabBids, analyzeTrade, getRosterSuggestions, findSleepers, findBusts } from './services/geminiService';
import PlayerTable from './components/PlayerTable';
import ClarificationForm from './components/ClarificationForm';
import { ClipboardIcon } from './components/icons/ClipboardIcon';
import { TrashIcon } from './components/icons/TrashIcon';
import PlayCallAIChat from './components/ChatCoPilot';
import InitialPromptUI from './components/InitialPromptUI';
import AnalysisResultModal from './components/AnalysisResultModal';
import LoadingSpinner from './components/LoadingSpinner';
import ContentInputForm from './components/UrlInputForm';
import ActionPrompts from './components/ActionPrompts';
import PositionFilterBar from './components/PositionFilterBar';
import { PlayCallAIIcon } from './components/icons/CoPilotIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';

const getLastName = (name: string): string => {
    const suffixes = ['jr', 'sr', 'ii', 'iii', 'iv', 'v'];
    const parts = name.toLowerCase().split(' ').filter(p => p && p !== '.' && !suffixes.includes(p));
    return parts.length > 0 ? parts[parts.length - 1] : '';
}

const initialHeaders: HeaderConfig[] = [
    { key: 'snakeRank', label: 'Snake Rank', sortable: true },
    { key: 'name', label: 'Player', sortable: true },
    { key: 'position', label: 'Pos', sortable: true },
    { key: 'team', label: 'Team', sortable: true },
    { key: 'bye', label: 'Bye', sortable: true },
];

const getPlaceholderText = (action: PostLoadAction | null): string => {
    switch (action) {
        case 'tiers':
            return "Paste your player rankings here.\n\nThe AI will extract the players and then generate positional tiers to create a draft-ready cheat sheet.";
        case 'faab':
            return "Paste your waiver wire list or general player data here.\n\nThe AI will identify potential free agents and suggest a FAAB bid for each.";
        case 'trade':
            return "Paste your player data AND the trade details in this box.\n\nExample:\n1. CeeDee Lamb\n2. Breece Hall\n...\nMy Team gets: Ja'Marr Chase\nTheir Team gets: Garrett Wilson, 2025 1st";
        case 'roster':
            return "Paste your full player data AND your current roster here.\n\nThe AI will use the data for player values and then analyze your team to provide strengths, weaknesses, and suggestions.";
        default:
            return "Paste your rankings, data, or a question here to get started...\n\nOr, select one of the actions above for tailored guidance.";
    }
};

const FILTER_ORDER = ['QB', 'RB', 'WR', 'TE', 'Flex', 'K', 'DST'];

function App() {
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string>('');
  
  const [dataForClarification, setDataForClarification] = useState<string>('');

  // --- View & Mode State ---
  const [selectedAction, setSelectedAction] = useState<PostLoadAction | null>(null);
  const [isAddingData, setIsAddingData] = useState<boolean>(false);

  // --- Rankings State ---
  const [players, setPlayers] = useState<AggregatedPlayer[]>([]);
  const [clarificationRequest, setClarificationRequest] = useState<ClarificationRequest | null>(null);
  const [headers, setHeaders] = useState<HeaderConfig[]>(initialHeaders);
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'snakeRank', direction: 'ascending' });
  const [positionFilters, setPositionFilters] = useState<string[]>([]);
  
  // --- Analysis Results State ---
  const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [analysisModalTitle, setAnalysisModalTitle] = useState('');
  const [tradeAnalysisResult, setTradeAnalysisResult] = useState<TradeAnalysis | null>(null);
  const [textAnalysisResult, setTextAnalysisResult] = useState<TextAnalysis | null>(null);

  // --- PlayCall AI State ---
  const [isChatVisible, setChatVisible] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
      {
          role: 'model',
          content: "Hi! I'm PlayCall AI. Ask me anything about your data or fantasy football in general."
      }
  ]);

  const playerLookupByLastName = useMemo(() => {
    const map = new Map<string, AggregatedPlayer>();
    players.forEach(p => {
        const key = `${getLastName(p.name)}|${p.position}|${p.team}`;
        if (!map.has(key)) {
            map.set(key, p);
        }
    });
    return map;
  }, [players]);
  
  const mergeData = (existingPlayers: AggregatedPlayer[], newPlayers: ExtractedPlayer[], source: string): AggregatedPlayer[] => {
    const playerMap = new Map<string, AggregatedPlayer>(existingPlayers.map(p => [p.name.toLowerCase(), p]));

    newPlayers.forEach(newPlayer => {
        const key = newPlayer.name.toLowerCase();
        let existingPlayer = playerMap.get(key);

        if (!existingPlayer) {
            const newPlayerLastName = getLastName(newPlayer.name);
            if (newPlayerLastName) {
                const fuzzyKey = `${newPlayerLastName}|${newPlayer.position}|${newPlayer.team}`;
                const matchedPlayer = playerLookupByLastName.get(fuzzyKey);
                if(matchedPlayer) {
                    existingPlayer = playerMap.get(matchedPlayer.name.toLowerCase());
                }
            }
        }

        if (existingPlayer) {
            if (newPlayer.name.length > existingPlayer.name.length) {
                playerMap.delete(existingPlayer.name.toLowerCase());
                existingPlayer.name = newPlayer.name;
                playerMap.set(newPlayer.name.toLowerCase(), existingPlayer);
            }
            
            existingPlayer.ranks[source] = newPlayer.rank;
            if (newPlayer.bye && !existingPlayer.bye) {
                existingPlayer.bye = newPlayer.bye;
            }
        } else {
            playerMap.set(key, {
                name: newPlayer.name,
                position: newPlayer.position,
                team: newPlayer.team,
                bye: newPlayer.bye,
                ranks: { [source]: newPlayer.rank },
                snakeRank: 0,
            });
        }
    });

    return Array.from(playerMap.values());
  };
  
  const calculateSnakeRanks = (players: AggregatedPlayer[]): AggregatedPlayer[] => {
    return players.map(player => {
      const ranks = Object.values(player.ranks)
        .filter((rank): rank is number => typeof rank === 'number' && !isNaN(rank));
      
      const avgRank = ranks.length > 0 ? ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length : Infinity;
      return { ...player, snakeRank: avgRank };
    });
  };

  const processPlayerExtraction = async (newPlayers: ExtractedPlayer[], source: string, fullText: string) => {
    setHeaders(prevHeaders => {
        const newSource = source || `Source ${prevHeaders.length}`;
        if (!prevHeaders.some(h => h.key === newSource)) {
           return [...prevHeaders, { key: newSource, label: newSource, sortable: true }];
        }
        return prevHeaders;
    });
    
    const finalSource = source || `Source ${headers.length}`;
    const merged = mergeData(players, newPlayers, finalSource);
    let finalPlayers = calculateSnakeRanks(merged);
    
    // --- Handle Post-Load Actions ---
    if (selectedAction === 'tiers') {
        setLoadingMessage('Generating Cheat Sheet...');
        const playersWithTiers = await generateTiers(finalPlayers);
        setPlayers(playersWithTiers);
        setHeaders(prev => [...prev.filter(h => h.key !== 'aiTier'), { key: 'aiTier', label: 'AI Tier', sortable: true }]);
    } else if (selectedAction === 'faab') {
        setLoadingMessage('Optimizing FAAB Bids...');
        const playersWithFaab = await generateFaabBids(finalPlayers);
        setPlayers(playersWithFaab);
        setHeaders(prev => [...prev.filter(h => h.key !== 'faabRec'), { key: 'faabRec', label: 'FAAB Rec. ($)', sortable: true }]);
    } else if (selectedAction === 'trade') {
        setLoadingMessage('Analyzing Trade...');
        const analysis = await analyzeTrade(fullText);
        setTradeAnalysisResult(analysis);
        setTextAnalysisResult(null);
        setAnalysisModalTitle('Trade Analysis');
        setAnalysisModalOpen(true);
        setPlayers(finalPlayers);
    } else if (selectedAction === 'roster') {
        setLoadingMessage('Analyzing Roster...');
        const suggestions = await getRosterSuggestions(fullText);
        setTextAnalysisResult(suggestions);
        setTradeAnalysisResult(null);
        setAnalysisModalTitle('Roster Suggestions');
        setAnalysisModalOpen(true);
        setPlayers(finalPlayers);
    } else {
        setPlayers(finalPlayers);
    }
    
    setDataForClarification('');
    setClarificationRequest(null);
  };

  const handleRankingsSubmit = async (data: string) => {
    try {
      setLoadingMessage('Drawing up the Xs and Os...');
      const result = await extractRankings(data);

      if (result.status === 'clarification_needed') {
        setDataForClarification(data); // Save data for re-submission
        setClarificationRequest(result.questions);
      } else if (result.status === 'success') {
        if (result.data.players.length === 0) {
            throw new Error("The AI could not extract any valid player data from the text. Please check the format of your pasted content.");
        }
        await processPlayerExtraction(result.data.players, result.data.source, data);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while extracting rankings.');
      }
    }
  }

  const hasData = useMemo(() => players.length > 0, [players]);

  const handleDataSubmit = useCallback(async (data: string) => {
    if (!data.trim()) {
      setError('Please provide some data to analyze.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setCopySuccess('');
    setClarificationRequest(null);

    await handleRankingsSubmit(data);

    setIsLoading(false);
    setLoadingMessage('');
    setIsAddingData(false); // Hide form after submit
  }, [players, selectedAction]);

  const handleClarificationSubmit = useCallback(async (answers: ClarificationAnswers) => {
    setIsLoading(true);
    setLoadingMessage('Processing...');
    setError(null);
    setCopySuccess('');
    
    try {
        const result = await extractRankings(dataForClarification, answers);
        if (result.status === 'success') {
            if (result.data.players.length === 0) {
                throw new Error("The AI still could not extract player data, even with the provided details. The text format might be incompatible.");
            }
            await processPlayerExtraction(result.data.players, result.data.source, dataForClarification);
        } else {
            throw new Error("Could not resolve questions. Please try again.");
        }
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred during clarification.');
        }
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [dataForClarification, players, selectedAction]);

  const handleSecondaryAction = async (action: SecondaryAction) => {
    setIsLoading(true);
    setError(null);
    setCopySuccess('');
    try {
        if (action === 'generate_tiers') {
            setLoadingMessage('Generating Tiers...');
            const playersWithTiers = await generateTiers(players);
            setPlayers(playersWithTiers);
            setHeaders(prev => {
                if (prev.some(h => h.key === 'aiTier')) return prev;
                return [...prev, { key: 'aiTier', label: 'AI Tier', sortable: true }];
            });
        } else if (action === 'find_sleepers') {
            setLoadingMessage('Finding Sleepers...');
            const result = await findSleepers(players);
            setAnalysisModalTitle('Potential Sleepers');
            setTextAnalysisResult(result);
            setTradeAnalysisResult(null);
            setAnalysisModalOpen(true);
        } else if (action === 'identify_busts') {
            setLoadingMessage('Identifying Busts...');
            const result = await findBusts(players);
            setAnalysisModalTitle('Potential Busts');
            setTextAnalysisResult(result);
            setTradeAnalysisResult(null);
            setAnalysisModalOpen(true);
        }
    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred while performing the action.');
        }
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };

  const sortedPlayers = useMemo(() => {
    const sortablePlayers = [...players];
    if (sortConfig !== null) {
      sortablePlayers.sort((a, b) => {
        const KNOWN_PLAYER_PROPS = ['snakeRank', 'name', 'position', 'team', 'bye', 'aiTier', 'faabRec'];
        const isRankKey = !KNOWN_PLAYER_PROPS.includes(sortConfig.key);

        const aValue = isRankKey ? a.ranks[sortConfig.key] : a[sortConfig.key as keyof Omit<AggregatedPlayer, 'ranks'>];
        const bValue = isRankKey ? b.ranks[sortConfig.key] : b[sortConfig.key as keyof Omit<AggregatedPlayer, 'ranks'>];
        
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortablePlayers;
  }, [players, sortConfig]);

  const availablePositions = useMemo(() => {
    if (players.length === 0) return [];
    const positionSet = new Set(players.map(p => p.position));
    const hasFlexComponents = positionSet.has('RB') || positionSet.has('WR') || positionSet.has('TE');

    return FILTER_ORDER.filter(pos => {
        if (pos === 'Flex') {
            return hasFlexComponents;
        }
        return positionSet.has(pos);
    });
  }, [players]);

  const filteredPlayers = useMemo(() => {
    if (positionFilters.length === 0) return sortedPlayers;
  
    const effectiveFilters = new Set(positionFilters);
    if (effectiveFilters.has('Flex')) {
        effectiveFilters.add('RB');
        effectiveFilters.add('WR');
        effectiveFilters.add('TE');
    }
  
    return sortedPlayers.filter(p => effectiveFilters.has(p.position));
  }, [sortedPlayers, positionFilters]);

  const handlePositionFilterChange = (position: string) => {
    setPositionFilters(prev => 
      prev.includes(position) ? prev.filter(p => p !== position) : [...prev, position]
    );
  };

  const handleSendMessage = useCallback(async (message: string) => {
      const newUserMessage: ChatMessage = { role: 'user', content: message };
      const updatedMessages = [...chatMessages, newUserMessage];
      setChatMessages(updatedMessages);
      setIsAiResponding(true);

      try {
          const aiResponse = await getChatResponse(
            updatedMessages,
            players.length > 0 ? filteredPlayers : [],
            headers
          );
          const newAiMessage: ChatMessage = { role: 'model', content: aiResponse };
          setChatMessages(prev => [...prev, newAiMessage]);
      } catch (err) {
          const errorMessage: ChatMessage = { role: 'model', content: "Sorry, I couldn't get a response. Please check your connection or try again." };
          setChatMessages(prev => [...prev, errorMessage]);
      } finally {
          setIsAiResponding(false);
      }
  }, [chatMessages, filteredPlayers, headers]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const handleHeaderLabelChange = (oldKey: string, newLabel: string) => {
    const newKey = newLabel.trim();

    if (!newKey) {
      setError("Header name cannot be empty.");
      setEditingHeader(null);
      return;
    }

    if (headers.some(h => h.key.toLowerCase() === newKey.toLowerCase() && h.key !== oldKey)) {
      setError(`A column named "${newKey}" already exists.`);
      setEditingHeader(null);
      return;
    }

    setHeaders(prevHeaders =>
      prevHeaders.map(h =>
        h.key === oldKey ? { ...h, key: newKey, label: newKey } : h
      )
    );

    setPlayers(prevPlayers =>
      prevPlayers.map(player => {
        if (Object.prototype.hasOwnProperty.call(player.ranks, oldKey)) {
          const newRanks = { ...player.ranks };
          newRanks[newKey] = newRanks[oldKey];
          delete newRanks[oldKey];
          return { ...player, ranks: newRanks };
        }
        return player;
      })
    );

    if (sortConfig.key === oldKey) {
      setSortConfig(prevConfig => ({ ...prevConfig, key: newKey }));
    }

    setEditingHeader(null);
  };

  const convertRankingsToCSV = (data: AggregatedPlayer[]): string => {
    const headerLabels = headers.map(h => `"${h.label}"`).join(',');
    const headerKeys = headers.map(h => h.key);

    const rows = data.map(player => {
        return headerKeys.map(key => {
            const KNOWN_PLAYER_PROPS = ['snakeRank', 'name', 'position', 'team', 'bye', 'aiTier', 'faabRec'];
            const isRankKey = !KNOWN_PLAYER_PROPS.includes(key);
            let value = isRankKey ? player.ranks[key] : player[key as keyof Omit<AggregatedPlayer, 'ranks'>];
            
            if (key === 'snakeRank' && typeof value === 'number' && value !== Infinity) {
                return (Math.round(value * 10) / 10).toFixed(1);
            }
            if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
            return value ?? '';
        }).join(',');
    });
    return [headerLabels, ...rows].join('\n');
  }

  const handleCopyToClipboard = useCallback(() => {
    if (players.length > 0) {
      const csvData = convertRankingsToCSV(filteredPlayers);
      navigator.clipboard.writeText(csvData).then(() => {
        setCopySuccess('Copied as CSV to clipboard!');
        setTimeout(() => setCopySuccess(''), 2000);
      }, () => {
        setError('Failed to copy to clipboard.');
      });
    }
  }, [filteredPlayers, headers]);

  const handleDownloadCSV = useCallback(() => {
    if (players.length > 0) {
      const csvData = convertRankingsToCSV(filteredPlayers);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'PlayCall_Rankings.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [filteredPlayers, headers]);

  const handleClear = useCallback(() => {
    setInputText('');
    setPlayers([]);
    setError(null);
    setIsLoading(false);
    setLoadingMessage('');
    setCopySuccess('');
    setClarificationRequest(null);
    setHeaders(initialHeaders);
    setSelectedAction(null);
    setAnalysisModalOpen(false);
    setTradeAnalysisResult(null);
    setTextAnalysisResult(null);
    setPositionFilters([]);
    setIsAddingData(false);
  }, []);

  const renderContent = () => {
    if (isLoading && !hasData) {
        return <LoadingSpinner message={loadingMessage || 'Loading...'} />;
    }
    if (clarificationRequest && !isLoading) {
        return (
            <ClarificationForm
                questions={clarificationRequest}
                onSubmit={handleClarificationSubmit}
                isLoading={isLoading}
            />
        );
    }
    if (error && !hasData) {
         return (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg text-center">
                <p className="font-bold">Error</p>
                <p>{error}</p>
            </div>
        );
    }

    if (hasData) {
        return (
            <div>
                 {isLoading && <LoadingSpinner message={loadingMessage || "Loading..."} />}
                 {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg text-center my-4">
                        <p className="font-bold">Error</p>
                        <p>{error}</p>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 mt-2 gap-4">
                     <ActionPrompts
                        onSecondaryAction={handleSecondaryAction}
                        onAddDataClick={() => setIsAddingData(true)}
                        disabled={isLoading}
                        showGeneralActions={hasData}
                    />
                    <div className="flex items-center space-x-2 self-end sm:self-center">
                        <button
                            onClick={handleDownloadCSV}
                            className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-500 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                            disabled={!hasData || isLoading}
                            aria-label="Download as CSV"
                        >
                            <DownloadIcon className="h-5 w-5 mr-2" />
                            Download
                        </button>
                        <button
                            onClick={handleCopyToClipboard}
                            className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-500 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                            disabled={!hasData || isLoading}
                             aria-label="Copy as CSV"
                        >
                            <ClipboardIcon className="h-5 w-5 mr-2" />
                            Copy
                        </button>
                        <button
                            onClick={handleClear}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                            aria-label="Clear All Data"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                {copySuccess && <p className="text-green-400 text-center mb-4">{copySuccess}</p>}
                
                {isAddingData && (
                    <div className="my-6">
                         <h3 className="text-xl font-bold text-white mb-4">Add More Data</h3>
                         <ContentInputForm
                            text={inputText}
                            setText={setInputText}
                            onSubmit={handleDataSubmit}
                            isLoading={isLoading}
                            placeholder="Paste your next data source here..."
                         />
                    </div>
                )}
                
                <PositionFilterBar 
                    availablePositions={availablePositions}
                    activeFilters={positionFilters}
                    onFilterChange={handlePositionFilterChange}
                />

                <PlayerTable 
                    players={filteredPlayers} 
                    headers={headers}
                    sortConfig={sortConfig}
                    requestSort={requestSort}
                    editingHeader={editingHeader}
                    setEditingHeader={setEditingHeader}
                    onHeaderLabelChange={handleHeaderLabelChange}
                />

            </div>
        );
    }

    // Initial View
    return (
        <>
            <InitialPromptUI 
                selectedAction={selectedAction}
                onSelect={setSelectedAction} 
            />
            <ContentInputForm
                text={inputText}
                setText={setInputText}
                onSubmit={handleDataSubmit}
                isLoading={isLoading}
                placeholder={getPlaceholderText(selectedAction)}
            />
        </>
    );
  }


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">PlayCall</h1>
            <p className="text-lg text-gray-400">
              Personalized AI insights, powered by your data.
            </p>
          </div>
          {hasData && (
            <button
                onClick={() => setChatVisible(true)}
                className="flex items-center gap-2 px-4 py-2 text-md font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 bg-blue-600 hover:bg-blue-700 text-white"
                aria-label="Open PlayCall AI Chat"
            >
                <PlayCallAIIcon className="h-5 w-5" />
                <span className="hidden sm:inline">PlayCall AI</span>
            </button>
          )}
        </header>
        <main className="bg-gray-800/50 p-6 rounded-2xl shadow-2xl backdrop-blur-sm border border-gray-700">
            {renderContent()}
        </main>
      </div>

      <PlayCallAIChat
        isVisible={isChatVisible}
        onClose={() => setChatVisible(false)}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        isResponding={isAiResponding}
      />
      <AnalysisResultModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setAnalysisModalOpen(false)}
        title={analysisModalTitle}
        tradeResult={tradeAnalysisResult}
        textResult={textAnalysisResult}
      />
    </div>
  );
}

export default App;