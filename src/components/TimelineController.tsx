/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Clock, AlertTriangle, Waves, Zap } from 'lucide-react';
import { HazardEvolutionStage } from '../types/index.ts';
import { HAZARD_EVOLUTION_STAGES } from '../data/seedData.ts';

interface TimelineControllerProps {
  currentStageIndex: number;
  isPlaying: boolean;
  speed: number;
  onSelectStage: (stageIndex: number) => void;
  onTogglePlay: () => void;
  onChangeSpeed: (speed: number) => void;
  className?: string;
}

export const TimelineController: React.FC<TimelineControllerProps> = ({
  currentStageIndex,
  isPlaying,
  speed,
  onSelectStage,
  onTogglePlay,
  onChangeSpeed,
  className = ''
}) => {
  const currentStage = HAZARD_EVOLUTION_STAGES[currentStageIndex] || HAZARD_EVOLUTION_STAGES[0];

  // Auto-play timer effect
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.round(4000 / speed);
    const timer = setInterval(() => {
      onSelectStage((currentStageIndex + 1) % HAZARD_EVOLUTION_STAGES.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, currentStageIndex, speed, onSelectStage]);

  return (
    <div className={`bg-[#0d131f]/95 backdrop-blur-md border border-slate-800/80 rounded-2xl p-3.5 shadow-xl ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Playback Controls & Timeline Label */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#131b2e] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onSelectStage(Math.max(0, currentStageIndex - 1))}
              disabled={currentStageIndex === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer"
              title="Previous Stage"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onTogglePlay}
              className={`px-3 py-1.5 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-cyan-600 hover:bg-cyan-500'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Simulate Evolution</span>
                </>
              )}
            </button>

            <button
              onClick={() => onSelectStage(Math.min(HAZARD_EVOLUTION_STAGES.length - 1, currentStageIndex + 1))}
              disabled={currentStageIndex === HAZARD_EVOLUTION_STAGES.length - 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer"
              title="Next Stage"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed Selectors */}
          <div className="flex items-center gap-1 bg-[#131b2e] p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
            {[1, 2, 5].map(s => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                className={`px-2 py-0.5 rounded cursor-pointer transition ${
                  speed === s ? 'bg-cyan-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-cyan-300 font-bold">{currentStage.timeOffsetLabel}</span>
          </div>
        </div>

        {/* Stage Title & Impact */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <Waves className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white text-xs">{currentStage.title}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-800">
              {currentStage.severityPercent}% Inundation
            </span>
          </div>
        </div>
      </div>

      {/* Visual Timeline Steps Bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80">
        <div className="grid grid-cols-5 gap-1.5">
          {HAZARD_EVOLUTION_STAGES.map((st, idx) => {
            const isActive = idx === currentStageIndex;
            const isPassed = idx < currentStageIndex;

            return (
              <button
                key={st.stageId}
                onClick={() => onSelectStage(idx)}
                className={`p-1.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-cyan-950/70 border-cyan-500 shadow-md ring-1 ring-cyan-500/80'
                    : isPassed
                    ? 'bg-[#11192b]/80 border-cyan-900/40 text-slate-400'
                    : 'bg-[#090d16]/60 border-slate-800/60 text-slate-500 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className={`font-mono font-bold ${isActive ? 'text-cyan-300' : 'text-slate-400'}`}>
                    {st.timeOffsetLabel.split(' ')[0]}
                  </span>
                  <span className={`font-semibold ${isActive ? 'text-white' : 'text-slate-500'}`}>
                    {st.severityPercent}%
                  </span>
                </div>
                <div className={`text-[10px] font-semibold truncate ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {st.title.split(' ')[0]} {st.title.split(' ')[1] || ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
