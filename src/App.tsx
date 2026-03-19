/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Menu, 
  History, 
  Plus, 
  Trash2, 
  Settings, 
  RotateCcw, 
  BookOpen, 
  LayoutDashboard,
  ChevronDown,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState, Round } from './types';

const STORAGE_KEY = 'choi_dai_di_state_v1';

const INITIAL_STATE: GameState = {
  players: ["Player 1", "Player 2", "Player 3", "Player 4"],
  pointValue: 1,
  baseScoreValue: 10,
  rounds: [],
  manualAdjustments: [0, 0, 0, 0],
  isSetup: true
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const [activeView, setActiveView] = useState<'setup' | 'scoreboard' | 'history' | 'rules' | 'settings'>(
    gameState.isSetup ? 'setup' : 'scoreboard'
  );

  const [numpadTarget, setNumpadTarget] = useState<{ roundId: string; playerIndex: number } | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  }, [gameState]);

  // Scoring Logic
  const calculateRoundScores = (inputs: (number | null)[], pointValue: number, baseScore: number) => {
    if (inputs.includes(null)) return { scores: [0, 0, 0, 0], error: null };

    const winners = inputs.filter(v => v === 0).length;
    if (winners === 0) return { scores: [0, 0, 0, 0], error: "NO WINNER" };
    if (winners > 1) return { scores: [0, 0, 0, 0], error: "MULTIPLE WINNERS" };

    // Unit Penalties
    const unitPenalties = (inputs as number[]).map(v => {
      if (v < 8) return v;
      if (v < 10) return v * 2;
      if (v < 13) return v * 3;
      return v * 4;
    });

    const totalPenalty = unitPenalties.reduce((a, b) => a + b, 0);
    
    // Base Scores (Zero-sum)
    const baseScores = unitPenalties.map(up => totalPenalty - (4 * up));

    // Final Scores with Bonus
    const finalScores = baseScores.map((bs, i) => {
      const bonus = (inputs[i] === 0) ? baseScore : -(baseScore / 3);
      return (bs + bonus) * pointValue;
    });

    return { scores: finalScores, error: null };
  };

  const handleStartSession = (players: string[], pointVal: number, baseVal: number) => {
    setGameState({
      ...INITIAL_STATE,
      players,
      pointValue: pointVal,
      baseScoreValue: baseVal,
      isSetup: false
    });
    setActiveView('scoreboard');
  };

  const handleAddRound = (prefilledInputs?: (number | null)[]) => {
    const { scores, error } = prefilledInputs 
      ? calculateRoundScores(prefilledInputs, gameState.pointValue, gameState.baseScoreValue)
      : { scores: [0, 0, 0, 0], error: null };

    const newRound: Round = {
      id: Math.random().toString(36).substr(2, 9),
      inputs: prefilledInputs || [null, null, null, null],
      scores,
      error,
      timestamp: Date.now()
    };
    setGameState(prev => ({
      ...prev,
      rounds: [newRound, ...prev.rounds]
    }));
  };

  const handleDeleteRound = (id: string) => {
    setGameState(prev => ({
      ...prev,
      rounds: prev.rounds.filter(r => r.id !== id)
    }));
  };

  const handleUpdateInput = (roundId: string, playerIndex: number, value: number | null) => {
    setGameState(prev => {
      const newRounds = prev.rounds.map(r => {
        if (r.id === roundId) {
          const newInputs = [...r.inputs];
          newInputs[playerIndex] = value;
          const { scores, error } = calculateRoundScores(newInputs, prev.pointValue, prev.baseScoreValue);
          return { ...r, inputs: newInputs, scores, error };
        }
        return r;
      });
      return { ...prev, rounds: newRounds };
    });
    setNumpadTarget(null);
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setGameState(INITIAL_STATE);
    setActiveView('setup');
    setShowResetModal(false);
  };

  // Totals Calculation
  const totals = [0, 0, 0, 0];
  const winCounts = [0, 0, 0, 0];
  gameState.rounds.forEach(r => {
    r.scores.forEach((s, i) => totals[i] += s);
    if (r.inputs.filter(v => v === 0).length === 1) {
      r.inputs.forEach((v, i) => { if (v === 0) winCounts[i]++; });
    }
  });
  gameState.manualAdjustments.forEach((adj, i) => {
    totals[i] += adj * gameState.pointValue;
  });

  return (
    <div className="min-h-screen bg-surface flex flex-col hk-grid">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-md flex justify-between items-center px-3 h-10 border-b border-primary-neon/20">
        <div className="flex items-center gap-2">
          <button className="p-1 rounded-lg text-primary-neon hover:bg-surface-container-highest transition-colors">
            <Menu size={16} />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="vertical-text text-[7px] font-black text-hk-gold opacity-60 uppercase tracking-tighter leading-none">HONG KONG</span>
            <h1 className="font-headline font-black uppercase tracking-[0.2em] text-sm text-primary-neon neon-jade">
              鋤Dee Pro
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded border border-hk-gold/30 bg-hk-gold/5">
            <span className="text-[6px] font-black text-hk-gold uppercase tracking-widest">MADE IN HK</span>
          </div>
          <button 
            onClick={() => setActiveView('history')}
            className="p-1 rounded-lg text-primary-neon hover:bg-surface-container-highest transition-colors"
          >
            <History size={16} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-12 pb-16 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          {activeView === 'setup' && (
            <SetupView key="setup" onStart={handleStartSession} initialData={gameState} />
          )}
          {activeView === 'scoreboard' && (
            <ScoreboardView 
              key="scoreboard"
              gameState={gameState}
              totals={totals}
              winCounts={winCounts}
              onAddRound={handleAddRound}
              onDeleteRound={handleDeleteRound}
              onOpenNumpad={(roundId, playerIndex) => setNumpadTarget({ roundId, playerIndex })}
              onManualAdjustment={(idx, val) => {
                const newAdj = [...gameState.manualAdjustments];
                newAdj[idx] = val;
                setGameState(prev => ({ ...prev, manualAdjustments: newAdj }));
              }}
              onUpdateInput={handleUpdateInput}
            />
          )}
          {activeView === 'rules' && <RulesView key="rules" />}
          {activeView === 'history' && <HistoryView key="history" rounds={gameState.rounds} players={gameState.players} />}
          {activeView === 'settings' && <SettingsView key="settings" onReset={() => setShowResetModal(true)} />}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-3 pt-1 bg-surface/90 backdrop-blur-xl border-t border-primary-neon/20">
        <NavButton 
          active={activeView === 'scoreboard'} 
          onClick={() => setActiveView('scoreboard')} 
          icon={<LayoutDashboard size={16} />} 
          label="Score" 
        />
        <NavButton 
          active={activeView === 'history'} 
          onClick={() => setActiveView('history')} 
          icon={<RotateCcw size={16} />} 
          label="Log" 
        />
        <NavButton 
          active={activeView === 'rules'} 
          onClick={() => setActiveView('rules')} 
          icon={<BookOpen size={16} />} 
          label="Rules" 
        />
        <NavButton 
          active={activeView === 'settings'} 
          onClick={() => setActiveView('settings')} 
          icon={<Settings size={16} />} 
          label="Setup" 
        />
      </nav>

      {/* Numpad Bottom Sheet */}
      <AnimatePresence>
        {numpadTarget && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNumpadTarget(null)}
              className="fixed inset-0 bg-black/60 z-[60]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 w-full bg-surface-container rounded-t-2xl z-[70] p-4 pb-10 border-t border-primary-neon/20 hk-tile"
            >
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-4" />
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(num => (
                  <button 
                    key={num}
                    onClick={() => handleUpdateInput(numpadTarget.roundId, numpadTarget.playerIndex, num)}
                    className="bg-surface-container-high py-3 rounded-lg font-headline text-xl font-black active:bg-primary-neon active:text-black transition-colors"
                  >
                    {num}
                  </button>
                ))}
                <button 
                  onClick={() => handleUpdateInput(numpadTarget.roundId, numpadTarget.playerIndex, null)}
                  className="bg-error-neon/10 text-error-neon col-span-2 py-3 rounded-lg font-headline text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-transform flex items-center justify-center gap-1.5 border border-error-neon/20"
                >
                  <X size={12} /> Clear
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reset Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface-container p-8 rounded-2xl relative max-w-sm w-full border border-white/5"
            >
              <h4 className="font-headline text-xl font-bold mb-2">Reset Session?</h4>
              <p className="text-on-surface-variant text-sm mb-8">All current progress and score history will be permanently deleted.</p>
              <div className="flex gap-4">
                <button 
                  className="flex-1 py-3 text-sm font-bold opacity-60" 
                  onClick={() => setShowResetModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 py-3 bg-error-neon text-white text-sm font-bold rounded-lg active:scale-95 transition-transform" 
                  onClick={handleReset}
                >
                  Reset All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center transition-all px-3 py-1 rounded-lg ${active ? 'text-primary-neon bg-primary-neon/10' : 'text-on-surface-variant hover:text-primary-neon'}`}
    >
      {icon}
      <span className="font-body text-[8px] font-black uppercase tracking-widest mt-0.5">{label}</span>
    </button>
  );
}

function SetupView({ onStart, initialData }: { onStart: (p: string[], pt: number, b: number) => void; initialData: GameState; key?: React.Key }) {
  const [players, setPlayers] = useState(initialData.players);
  const [pointVal, setPointVal] = useState(initialData.pointValue);
  const [baseVal, setBaseVal] = useState(initialData.baseScoreValue);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="px-4 max-w-lg mx-auto"
    >
      <div className="mb-4 text-center">
        <h2 className="font-headline text-xl font-black uppercase tracking-widest mb-0.5 neon-jade">New Session</h2>
        <p className="text-on-surface-variant font-body text-[8px] uppercase tracking-[0.3em] font-black">Configure Table</p>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {players.map((name, i) => (
            <div key={i} className="space-y-0.5">
              <label className="text-[7px] uppercase tracking-widest text-on-surface-variant font-black px-1 opacity-60">P{i + 1}</label>
              <input 
                className="w-full bg-surface-container border border-white/5 rounded-md p-2 font-headline font-bold focus:ring-1 focus:ring-primary-neon/50 text-white placeholder:opacity-20 text-xs"
                value={name}
                onChange={(e) => {
                  const newP = [...players];
                  newP[i] = e.target.value;
                  setPlayers(newP);
                }}
                placeholder={`Player ${i + 1}`}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-surface-container rounded-md p-2 flex flex-col items-center border border-white/5">
            <span className="text-[7px] uppercase tracking-widest text-on-surface-variant font-black mb-0.5 opacity-60">Point Val</span>
            <input 
              type="number"
              className="bg-transparent text-center font-headline text-lg font-black w-full border-none focus:ring-0 text-primary-neon"
              value={pointVal}
              onChange={(e) => setPointVal(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="bg-surface-container rounded-md p-2 flex flex-col items-center border border-white/5">
            <span className="text-[7px] uppercase tracking-widest text-on-surface-variant font-black mb-0.5 opacity-60">Base Score</span>
            <input 
              type="number"
              className="bg-transparent text-center font-headline text-lg font-black w-full border-none focus:ring-0 text-primary-neon"
              value={baseVal}
              onChange={(e) => setBaseVal(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <button 
            onClick={() => onStart(players, pointVal, baseVal)}
            className="w-full py-2.5 bg-gradient-to-br from-hk-jade to-primary-container text-white font-headline font-black text-[10px] uppercase tracking-[0.2em] rounded-md shadow-[0_4px_12px_rgba(0,168,107,0.2)] active:scale-95 transition-transform"
          >
            Start Session
          </button>
          <button 
            className="w-full py-2.5 border border-primary-neon/20 text-primary-neon font-headline font-black text-[10px] uppercase tracking-[0.2em] rounded-md hover:bg-primary-neon/5 active:scale-95 transition-transform"
          >
            Resume Last Game
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ScoreboardView({ 
  gameState, 
  totals, 
  winCounts, 
  onAddRound, 
  onDeleteRound, 
  onOpenNumpad,
  onManualAdjustment,
  onUpdateInput
}: { 
  gameState: GameState; 
  totals: number[]; 
  winCounts: number[]; 
  onAddRound: () => void; 
  onDeleteRound: (id: string) => void;
  onOpenNumpad: (rid: string, pidx: number) => void;
  onManualAdjustment: (idx: number, val: number) => void;
  onUpdateInput: (roundId: string, playerIndex: number, value: number | null) => void;
  key?: React.Key;
}) {
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);
  const [currentInputs, setCurrentInputs] = useState<(number | null)[]>([null, null, null, null]);
  const [isExpanded, setIsExpanded] = useState(true);

  const getCardColor = (num: number | null) => {
    if (num === null) return 'text-white/10';
    if (num === 0) return 'text-hk-jade';
    if (num <= 7) return 'text-white';
    if (num <= 9) return 'text-hk-gold';
    if (num <= 12) return 'text-orange-500';
    return 'text-hk-red';
  };

  const handleNumClick = (num: number) => {
    const newInputs = [...currentInputs];
    newInputs[activePlayerIdx] = num;
    setCurrentInputs(newInputs);
    
    if (activePlayerIdx < 3) {
      setActivePlayerIdx(activePlayerIdx + 1);
    }
  };

  const handleClear = () => {
    setCurrentInputs([null, null, null, null]);
    setActivePlayerIdx(0);
  };

  const handleSubmitRound = () => {
    if (currentInputs.includes(null)) return;
    
    // We reuse the logic to add a round but with pre-filled inputs
    const newRoundId = Math.random().toString(36).substr(2, 9);
    // This is a bit tricky because onAddRound in App.tsx creates an empty round.
    // I should probably pass a specialized function or modify App.tsx to handle this.
    // For now, I'll trigger a custom event or just use the existing props if I can.
    // Actually, let's modify the parent to accept a pre-filled round.
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full"
    >
      {/* Sticky Score Header */}
      <div className="sticky top-0 z-40 bg-surface/90 backdrop-blur-xl border-b border-primary-neon/20 px-1.5 py-1.5">
        <div className="grid grid-cols-4 gap-1 max-w-4xl mx-auto">
          {gameState.players.map((name, i) => (
            <div key={i} className="flex flex-col items-center p-1 rounded-md bg-surface-container-high border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-[7px] font-black uppercase tracking-tighter text-on-surface-variant truncate w-full text-center opacity-70">{name}</span>
              <span className={`font-headline text-sm font-black leading-none mt-0.5 ${totals[i] >= 0 ? 'text-hk-jade neon-jade' : 'text-hk-red neon-red'}`}>
                {totals[i] > 0 ? `+${Math.round(totals[i])}` : Math.round(totals[i])}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[6px] opacity-30 font-black uppercase tracking-widest">{winCounts[i]}W</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-2 py-3 space-y-3 w-full flex-1">
        {/* Manual Adjustments */}
        <section className="bg-surface-container p-3 rounded-lg relative overflow-hidden group border border-white/5 hk-tile">
          <div className="absolute top-0 right-0 w-16 h-16 bg-hk-gold/10 rounded-full -mr-8 -mt-8 blur-xl" />
          <div className="flex justify-between items-center mb-2 px-1">
            <h3 className="font-headline font-black text-[8px] uppercase tracking-[0.2em] text-hk-gold flex items-center gap-1.5">
              <Settings size={10} /> Penalty Units
            </h3>
            <span className="text-[6px] text-white/20 uppercase font-black tracking-widest">Manual Adjust</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {gameState.manualAdjustments.map((adj, i) => (
              <input 
                key={i}
                type="number"
                placeholder={gameState.players[i].substring(0, 2)}
                className="bg-surface-container-high border border-white/5 rounded-md p-1.5 text-center font-headline font-black text-xs focus:ring-1 focus:ring-hk-gold/30 text-white placeholder:opacity-10"
                value={adj || ''}
                onChange={(e) => onManualAdjustment(i, parseInt(e.target.value) || 0)}
              />
            ))}
          </div>
        </section>

        {/* Round List */}
        <div className="space-y-2 pb-64">
          {gameState.rounds.map((round, rIdx) => (
            <motion.div 
              layout
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              key={round.id}
              className={`bg-surface-container-high p-2 rounded-md border transition-colors ${round.error ? 'border-hk-red/50' : 'border-white/5'}`}
            >
              <div className="flex justify-between items-center mb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-headline font-black uppercase tracking-[0.2em] text-on-surface-variant">
                    R{gameState.rounds.length - rIdx}
                  </span>
                  {round.error && (
                    <span className="text-[6px] font-black text-hk-red uppercase tracking-tighter bg-hk-red/10 px-1 rounded">{round.error}</span>
                  )}
                </div>
                <button 
                  onClick={() => onDeleteRound(round.id)}
                  className="text-hk-red/20 hover:text-hk-red transition-colors p-1"
                >
                  <Trash2 size={10} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {round.inputs.map((val, pIdx) => (
                  <div key={pIdx} className="flex flex-col gap-0.5">
                    <span className="text-[6px] uppercase tracking-tighter opacity-20 font-black text-center">
                      {gameState.players[pIdx].substring(0, 3)}
                    </span>
                    <button 
                      onClick={() => onOpenNumpad(round.id, pIdx)}
                      className={`w-full h-8 bg-surface-container rounded font-headline font-black text-sm flex items-center justify-center border border-white/5 ${getCardColor(val)}`}
                    >
                      {val === null ? '—' : val}
                    </button>
                    <span className={`text-[7px] text-center font-black tracking-tighter ${round.scores[pIdx] >= 0 ? 'text-hk-jade' : 'text-hk-red'}`}>
                      {round.scores[pIdx] > 0 ? '+' : ''}{Math.round(round.scores[pIdx])}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Persistent Quick Entry Panel */}
      <div className={`fixed bottom-16 left-0 w-full bg-surface-container border-t border-primary-neon/20 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 ${isExpanded ? 'p-1.5' : 'p-0.5'}`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-0.5 px-2">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 group"
            >
              <h3 className="font-headline text-[7px] uppercase tracking-[0.2em] text-white/40 group-hover:text-hk-jade transition-colors">Quick Entry</h3>
              <ChevronDown size={8} className={`text-white/20 group-hover:text-hk-jade transition-all ${isExpanded ? '' : 'rotate-180'}`} />
            </button>
            {currentInputs.every(v => v !== null) && (
              <div className="text-[7px] font-headline uppercase tracking-widest">
                {currentInputs.filter(v => v === 0).length === 0 ? (
                  <span className="text-hk-red">No Winner</span>
                ) : currentInputs.filter(v => v === 0).length > 1 ? (
                  <span className="text-hk-red">Multi Win</span>
                ) : (
                  <span className="text-hk-jade">Ready</span>
                )}
              </div>
            )}
          </div>
          {/* Current Selection Display */}
          <div className="grid grid-cols-4 gap-1 mb-1.5">
            {gameState.players.map((name, i) => (
              <button 
                key={i}
                onClick={() => {
                  setActivePlayerIdx(i);
                  if (!isExpanded) setIsExpanded(true);
                }}
                className={`flex flex-col items-center py-1 px-1 rounded-md border transition-all ${activePlayerIdx === i ? 'bg-hk-jade/10 border-hk-jade' : 'bg-surface-container-high border-transparent'}`}
              >
                <span className="text-[6px] font-bold uppercase opacity-50">{name.substring(0, 3)}</span>
                <span className={`font-headline text-sm font-bold ${getCardColor(currentInputs[i])}`}>
                  {currentInputs[i] === null ? '—' : currentInputs[i]}
                </span>
              </button>
            ))}
          </div>

          {/* Numpad Grid */}
          {isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="grid grid-cols-8 gap-0.5 overflow-hidden"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(num => (
                <button 
                  key={num}
                  onClick={() => handleNumClick(num)}
                  className={`bg-surface-container-high py-1 rounded-md font-headline text-xs font-bold active:bg-hk-jade active:text-black transition-colors ${getCardColor(num)}`}
                >
                  {num}
                </button>
              ))}
              <button 
                onClick={handleClear}
                className="bg-surface-container-high py-1 rounded-md font-headline text-[8px] font-bold uppercase tracking-tight text-hk-red/60"
              >
                CLR
              </button>
              <button 
                onClick={() => {
                  const hasWinner = currentInputs.filter(v => v === 0).length === 1;
                  if (!currentInputs.includes(null) && hasWinner) {
                    (onAddRound as any)(currentInputs);
                    handleClear();
                  }
                }}
                disabled={currentInputs.includes(null) || currentInputs.filter(v => v === 0).length !== 1}
                className={`py-1 rounded-md font-headline text-[8px] font-bold uppercase tracking-tight transition-all ${
                  currentInputs.includes(null) || currentInputs.filter(v => v === 0).length !== 1
                    ? 'bg-white/5 text-white/20' 
                    : 'bg-hk-jade text-white shadow-[0_0_8px_rgba(0,168,107,0.3)]'
                }`}
              >
                ADD
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function RulesView({ key }: { key?: React.Key }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 max-w-lg mx-auto space-y-6"
    >
      <div className="text-center">
        <h2 className="font-headline text-xl font-black uppercase tracking-widest mb-0.5 neon-jade">Game Rules</h2>
        <p className="text-on-surface-variant font-body text-[8px] uppercase tracking-[0.3em] font-black">鋤Dee Scoring System</p>
      </div>

      <div className="space-y-2">
        <RuleItem title="0 Cards" value="Winner (Positive Score)" color="text-primary-neon neon-jade" />
        <RuleItem title="1-7 Cards" value="1x Penalty Units" />
        <RuleItem title="8-9 Cards" value="2x Penalty Units" />
        <RuleItem title="10-12 Cards" value="3x Penalty Units" />
        <RuleItem title="13 Cards" value="4x Penalty Units" />
      </div>

      <div className="bg-surface-container p-4 rounded-xl border border-primary-neon/10 hk-tile">
        <h4 className="font-headline font-black text-[10px] uppercase tracking-widest text-primary-neon mb-1.5 neon-jade">Bonus Calculation</h4>
        <p className="text-[11px] text-on-surface-variant leading-relaxed font-medium">
          The winner receives the sum of all penalty units from other players. 
          Additionally, a base score bonus (default +3) is awarded to the winner, 
          while losers share the penalty (default -1 each).
        </p>
      </div>
    </motion.div>
  );
}

function RuleItem({ title, value, color }: { title: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center bg-surface-container p-3 rounded-lg border border-white/5">
      <span className="font-headline font-black text-xs uppercase tracking-wider">{title}</span>
      <span className={`font-body text-[10px] font-bold uppercase tracking-tight ${color || 'text-on-surface-variant'}`}>{value}</span>
    </div>
  );
}

function HistoryView({ rounds, players }: { rounds: Round[]; players: string[]; key?: React.Key }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 max-w-lg mx-auto space-y-4"
    >
      <div className="text-center">
        <h2 className="font-headline text-xl font-black uppercase tracking-widest mb-0.5 neon-jade">Session History</h2>
        <p className="text-on-surface-variant font-body text-[8px] uppercase tracking-[0.3em] font-black">Previous Rounds</p>
      </div>

      {rounds.length === 0 ? (
        <div className="text-center py-12 opacity-10">
          <History size={32} className="mx-auto mb-2" />
          <p className="text-[10px] font-black uppercase tracking-widest">No rounds recorded yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {rounds.map((r, i) => (
            <div key={r.id} className="bg-surface-container p-2 rounded-md flex justify-between items-center border border-white/5">
              <div>
                <span className="text-[7px] font-black text-on-surface-variant uppercase tracking-widest">Round {rounds.length - i}</span>
                <div className="flex gap-1 mt-0.5">
                  {r.scores.map((s, idx) => (
                    <span key={idx} className={`text-[9px] font-black ${s >= 0 ? 'text-hk-jade' : 'text-hk-red'}`}>
                      {s > 0 ? '+' : ''}{Math.round(s)}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-[7px] font-black opacity-20 uppercase tracking-tighter">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function SettingsView({ onReset }: { onReset: () => void; key?: React.Key }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="px-4 max-w-lg mx-auto space-y-6"
    >
      <div className="text-center">
        <h2 className="font-headline text-xl font-black uppercase tracking-widest mb-0.5 neon-jade">Settings</h2>
        <p className="text-on-surface-variant font-body text-[8px] uppercase tracking-[0.3em] font-black">Manage your session</p>
      </div>

      <div className="space-y-3">
        <button 
          onClick={onReset}
          className="w-full p-4 bg-error-neon/5 border border-error-neon/20 rounded-xl flex items-center justify-between group hover:bg-error-neon/10 transition-colors"
        >
          <div className="text-left">
            <h4 className="font-headline font-black text-xs uppercase tracking-widest text-error-neon neon-red">Reset All Data</h4>
            <p className="text-[8px] text-error-neon/60 uppercase font-black tracking-widest mt-0.5">Clear all rounds and player names</p>
          </div>
          <RotateCcw size={16} className="text-error-neon group-hover:rotate-180 transition-transform duration-500" />
        </button>

        <div className="p-4 bg-surface-container rounded-xl border border-white/5 hk-tile">
          <h4 className="font-headline font-black text-[10px] uppercase tracking-widest mb-1.5">About 鋤Dee Pro</h4>
          <p className="text-[11px] text-on-surface-variant leading-relaxed font-medium">
            Version 1.1.0<br />
            Designed for professional 鋤Dee players.<br />
            <span className="text-hk-gold font-black tracking-widest text-[9px] uppercase">Made in Hong Kong</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
