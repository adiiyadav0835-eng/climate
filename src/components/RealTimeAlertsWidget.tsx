/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle, Bell, CheckCheck, MapPin, ShieldAlert, Info, AlertOctagon } from 'lucide-react';
import { AlertNotification, AlertSeverity } from '../types/index.ts';

interface RealTimeAlertsWidgetProps {
  alerts: AlertNotification[];
  onSelectAlert?: (alert: AlertNotification) => void;
  onMarkAllRead?: () => void;
  className?: string;
}

export const RealTimeAlertsWidget: React.FC<RealTimeAlertsWidgetProps> = ({
  alerts,
  onSelectAlert,
  onMarkAllRead,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'All' | AlertSeverity>('All');

  const filteredAlerts = alerts.filter(item => {
    if (activeTab === 'All') return true;
    return item.severity === activeTab;
  });

  const criticalCount = alerts.filter(a => a.severity === 'Critical').length;
  const warningCount = alerts.filter(a => a.severity === 'Warning').length;

  return (
    <div className={`bg-[#0d131f]/95 backdrop-blur-md border border-slate-800/80 rounded-2xl flex flex-col shadow-2xl overflow-hidden ${className}`}>
      {/* Widget Header with Tabs (Matching Top-Right Reference Image) */}
      <div className="p-3.5 border-b border-slate-800/80 bg-[#090d16]/90 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Real Time Alerts</span>
              {criticalCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              )}
            </h3>
            <p className="text-[10px] text-slate-400">Live operational telemetry feed</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#131b2e] p-1 rounded-lg border border-slate-800 text-[11px]">
          <button
            onClick={() => setActiveTab('All')}
            className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
              activeTab === 'All' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            View All ({alerts.length})
          </button>
          <button
            onClick={() => setActiveTab('Critical')}
            className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
              activeTab === 'Critical' ? 'bg-rose-600 text-white font-bold' : 'text-rose-400 hover:text-rose-300'
            }`}
          >
            Critical ({criticalCount})
          </button>
          <button
            onClick={() => setActiveTab('Warning')}
            className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
              activeTab === 'Warning' ? 'bg-amber-600 text-white font-bold' : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            Warning ({warningCount})
          </button>
          <button
            onClick={() => setActiveTab('Info')}
            className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
              activeTab === 'Info' ? 'bg-blue-600 text-white font-bold' : 'text-blue-400 hover:text-blue-300'
            }`}
          >
            Info
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-slate-800/60 text-xs">
        {filteredAlerts.map(item => {
          const isCrit = item.severity === 'Critical';
          const isWarn = item.severity === 'Warning';

          return (
            <div
              key={item.id}
              onClick={() => onSelectAlert && onSelectAlert(item)}
              className={`p-3 transition cursor-pointer hover:bg-slate-800/40 flex items-start gap-3 ${
                !item.isRead ? 'bg-slate-900/60' : ''
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isCrit ? (
                  <AlertOctagon className="w-4 h-4 text-rose-500" />
                ) : isWarn ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                ) : (
                  <Info className="w-4 h-4 text-cyan-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-white text-xs truncate">{item.alert}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        isCrit
                          ? 'bg-rose-950/90 text-rose-300 border border-rose-800/80'
                          : isWarn
                          ? 'bg-amber-950/90 text-amber-300 border border-amber-800/80'
                          : 'bg-blue-950/90 text-blue-300 border border-blue-800/80'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-mono">{item.time}</span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-cyan-400 font-medium mb-1">
                  <MapPin className="w-3 h-3 text-cyan-500 shrink-0" />
                  <span className="truncate">{item.location}</span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}

        {filteredAlerts.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-xs">
            No active alerts matching filter.
          </div>
        )}
      </div>

      {/* Widget Footer */}
      <div className="p-2.5 border-t border-slate-800/80 bg-[#090d16]/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>Showing {filteredAlerts.length} events</span>
        {onMarkAllRead && (
          <button
            onClick={onMarkAllRead}
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-medium"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>
    </div>
  );
};
