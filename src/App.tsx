/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Settings, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Package, 
  DollarSign,
  History,
  AlertTriangle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface Sale {
  id: string;
  time: string;
  broughtContainer: boolean;
  identification?: string;
  profit: number;
  gross: number;
}

interface Settings {
  buyPrice: number;
  sellPrice: number;
}

interface DayData {
  [date: string]: Sale[];
}

// --- Constants ---

const STORAGE_KEY_SETTINGS = 'gas_control_settings';
const STORAGE_KEY_SALES = 'gas_control_sales';

export default function App() {
  // --- State ---
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return saved ? JSON.parse(saved) : { buyPrice: 0, sellPrice: 0 };
  });

  const [allSales, setAllSales] = useState<DayData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SALES);
    return saved ? JSON.parse(saved) : {};
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  
  // Custom Alert/Confirm State
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    type: 'alert' | 'confirm';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  });
  
  // New Sale Flow State
  const [step, setStep] = useState(1); // 1: Brought Container?, 2: Identification
  const [newSaleData, setNewSaleData] = useState<{ broughtContainer: boolean; identification: string }>({
    broughtContainer: true,
    identification: ''
  });

  // --- Helpers ---

  const today = new Date().toISOString().split('T')[0];
  const currentSales = useMemo(() => allSales[today] || [], [allSales, today]);

  const stats = useMemo(() => {
    return currentSales.reduce((acc, sale) => ({
      totalSales: acc.totalSales + 1,
      totalProfit: acc.totalProfit + sale.profit,
      totalGross: acc.totalGross + sale.gross
    }), { totalSales: 0, totalProfit: 0, totalGross: 0 });
  }, [currentSales]);

  // --- Effects ---

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(allSales));
  }, [allSales]);

  useEffect(() => {
    const isAnyModalOpen = showSettings || showSaleModal || showSummaryModal || dialog.isOpen;
    if (isAnyModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [showSettings, showSaleModal, showSummaryModal, dialog.isOpen]);

  // --- Actions ---

  const handleAddSale = () => {
    if (settings.buyPrice <= 0 || settings.sellPrice <= 0) {
      setDialog({
        isOpen: true,
        title: "Configuração Necessária",
        message: "Por favor, configure os valores de compra e venda primeiro.",
        type: 'alert',
        onConfirm: () => setShowSettings(true)
      });
      return;
    }
    setStep(1);
    setNewSaleData({ broughtContainer: true, identification: '' });
    setShowSaleModal(true);
  };

  const confirmSale = (finalIdentification?: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const profit = settings.sellPrice - settings.buyPrice;
    
    const newSale: Sale = {
      id: crypto.randomUUID(),
      time: timeStr,
      broughtContainer: newSaleData.broughtContainer,
      identification: finalIdentification || newSaleData.identification,
      profit: profit,
      gross: settings.sellPrice
    };

    setAllSales(prev => ({
      ...prev,
      [today]: [newSale, ...(prev[today] || [])]
    }));

    setShowSaleModal(false);
  };

  const closeDay = () => {
    if (currentSales.length === 0) return;
    
    const totalVendas = currentSales.length;
    const valorBruto = currentSales.reduce((acc, v) => acc + v.gross, 0);
    const lucroLiquido = currentSales.reduce((acc, v) => acc + v.profit, 0);

    setDialog({
      isOpen: true,
      title: "RESUMO DO DIA",
      message: `Vendas realizadas: ${totalVendas}\nValor Bruto: R$ ${valorBruto.toFixed(2)}\nLucro Líquido: R$ ${lucroLiquido.toFixed(2)}`,
      type: 'alert',
      onConfirm: () => setShowSummaryModal(true)
    });
  };

  const clearDay = () => {
    setDialog({
      isOpen: true,
      title: "Limpar Registros",
      message: "Deseja realmente limpar os registros de hoje?",
      type: 'confirm',
      onConfirm: () => {
        setAllSales(prev => {
          const next = { ...prev };
          delete next[today];
          return next;
        });
        setShowSummaryModal(false);
      }
    });
  };

  const resetAll = () => {
    setDialog({
      isOpen: true,
      title: "RESETAR TUDO",
      message: "ATENÇÃO: Isso apagará permanentemente todas as vendas e configurações. Deseja continuar?",
      type: 'confirm',
      onConfirm: () => {
        // 1. Limpa o armazenamento físico
        localStorage.clear();
        
        // 2. Limpa o estado do React para feedback visual imediato
        setAllSales({});
        setSettings({ buyPrice: 0, sellPrice: 0 });
        
        // 3. Fecha qualquer interface aberta
        setShowSettings(false);
        setShowSaleModal(false);
        setShowSummaryModal(false);
        
        // 4. Recarrega a aplicação para garantir um estado totalmente limpo
        window.location.href = window.location.href;
      }
    });
  };

  // --- Render Helpers ---

  const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="modal"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-zinc-900">{title}</h3>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <X size={24} className="text-zinc-500" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // --- Sub-components for local state isolation ---

  const SettingsContent = () => {
    const [localBuy, setLocalBuy] = useState(settings.buyPrice);
    const [localSell, setLocalSell] = useState(settings.sellPrice);

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Valor de Compra (Custo)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-mono">R$</span>
              <input 
                type="number" 
                value={localBuy || ''}
                onChange={(e) => setLocalBuy(Number(e.target.value))}
                className="w-full pl-12 pr-4 py-4 bg-zinc-100 rounded-2xl font-mono text-lg focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Valor de Venda</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-mono">R$</span>
              <input 
                type="number" 
                value={localSell || ''}
                onChange={(e) => setLocalSell(Number(e.target.value))}
                className="w-full pl-12 pr-4 py-4 bg-zinc-100 rounded-2xl font-mono text-lg focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
        <button 
          onClick={() => {
            setSettings({ buyPrice: localBuy, sellPrice: localSell });
            setShowSettings(false);
          }}
          className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold active:scale-95 transition-transform"
        >
          SALVAR CONFIGURAÇÕES
        </button>
      </div>
    );
  };

  const SaleContent = () => {
    const [localId, setLocalId] = useState(newSaleData.identification);

    if (step === 1) {
      return (
        <div className="space-y-6">
          <p className="text-center text-zinc-600 font-medium">O cliente trouxe o vasilhame?</p>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => {
                setNewSaleData(d => ({ ...d, broughtContainer: true }));
                confirmSale();
              }}
              className="flex flex-col items-center gap-3 p-6 bg-emerald-50 border-2 border-emerald-200 rounded-3xl active:scale-95 transition-transform"
            >
              <CheckCircle2 size={40} className="text-emerald-500" />
              <span className="font-bold text-emerald-700">SIM</span>
            </button>
            <button 
              onClick={() => {
                setNewSaleData(d => ({ ...d, broughtContainer: false }));
                setStep(2);
              }}
              className="flex flex-col items-center gap-3 p-6 bg-amber-50 border-2 border-amber-200 rounded-3xl active:scale-95 transition-transform"
            >
              <XCircle size={40} className="text-amber-500" />
              <span className="font-bold text-amber-700">NÃO</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Identificação / Apelido (Opcional)</label>
          <input 
            type="text" 
            autoFocus
            value={localId}
            onChange={(e) => setLocalId(e.target.value)}
            className="w-full px-4 py-4 bg-zinc-100 rounded-2xl font-medium text-lg focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
            placeholder="Ex: João da Esquina"
          />
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setStep(1)}
            className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold active:scale-95 transition-transform"
          >
            VOLTAR
          </button>
          <button 
            onClick={() => confirmSale(localId)}
            className="flex-[2] py-4 bg-zinc-900 text-white rounded-2xl font-bold active:scale-95 transition-transform"
          >
            CONFIRMAR VENDA
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans pb-32">
      {/* Fixed Header Panel */}
      <header className="fixed top-0 left-0 right-0 bg-zinc-900 text-white z-40 shadow-lg safe-top">
        <div className="max-w-md mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Vendas Hoje</span>
            <span className="text-2xl font-bold font-mono">{stats.totalSales}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Lucro Total</span>
            <span className="text-2xl font-bold font-mono text-emerald-400">
              R$ {stats.totalProfit.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Bruto</span>
            <span className="text-2xl font-bold font-mono">
              R$ {stats.totalGross.toFixed(2)}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto pt-24 px-4 space-y-6">
        
        {/* Settings Trigger */}
        <section className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-zinc-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center">
              <Settings size={20} className="text-zinc-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Configurações</p>
              <p className="text-xs text-zinc-500">Preços: R$ {settings.buyPrice} / R$ {settings.sellPrice}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-lg active:scale-95 transition-transform"
          >
            EDITAR
          </button>
        </section>

        {/* New Sale Button */}
        <section>
          <button 
            onClick={handleAddSale}
            className="w-full py-6 bg-emerald-500 text-white rounded-3xl shadow-xl shadow-emerald-200 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all group"
          >
            <Plus size={32} className="group-hover:rotate-90 transition-transform" />
            <span className="text-lg font-black uppercase tracking-tighter">Nova Venda</span>
          </button>
        </section>

        {/* Sales List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <History size={14} /> Histórico de Hoje
            </h2>
            <span className="text-[10px] font-mono text-zinc-400">{today}</span>
          </div>

          {currentSales.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-zinc-400 bg-white rounded-3xl border border-dashed border-zinc-300">
              <Package size={48} strokeWidth={1} className="mb-2 opacity-20" />
              <p className="text-sm italic">Nenhuma venda registrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentSales.map((sale) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={sale.id}
                  className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">Hora</p>
                      <p className="text-sm font-mono font-bold">{sale.time}</p>
                    </div>
                    <div className="h-8 w-[1px] bg-zinc-100" />
                    <div>
                      <p className="text-xs font-bold text-zinc-900">
                        {sale.identification || (sale.broughtContainer ? "Venda Direta" : "Sem Vasilhame")}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {sale.broughtContainer ? (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">Com Vasilhame</span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase">Sem Vasilhame</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Lucro</p>
                    <p className="text-sm font-mono font-bold text-emerald-600">
                      +R$ {sale.profit.toFixed(2)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Footer Actions */}
        <section className="grid grid-cols-2 gap-4 pt-4">
          <button 
            onClick={closeDay}
            disabled={currentSales.length === 0}
            className="flex items-center justify-center gap-2 py-4 bg-zinc-200 text-zinc-700 rounded-2xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
          >
            <CheckCircle2 size={18} /> Fechar Dia
          </button>
          <button 
            onClick={resetAll}
            className="flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-sm active:scale-95 transition-transform"
          >
            <Trash2 size={18} /> Resetar Tudo
          </button>
        </section>
      </main>

      {/* --- Modals --- */}

      {/* Settings Modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Configurações">
        <SettingsContent />
      </Modal>

      {/* New Sale Modal */}
      <Modal isOpen={showSaleModal} onClose={() => setShowSaleModal(false)} title="Nova Venda">
        <SaleContent />
      </Modal>

      {/* Summary Modal */}
      <Modal isOpen={showSummaryModal} onClose={() => setShowSummaryModal(false)} title="Resumo do Dia">
        <div className="space-y-6">
          <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-200 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 font-medium">Total de Vendas</span>
              <span className="font-mono font-bold text-lg">{stats.totalSales}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 font-medium">Faturamento Bruto</span>
              <span className="font-mono font-bold text-lg">R$ {stats.totalGross.toFixed(2)}</span>
            </div>
            <div className="h-[1px] bg-zinc-200" />
            <div className="flex justify-between items-center">
              <span className="text-zinc-900 font-bold">Lucro Líquido</span>
              <span className="font-mono font-bold text-2xl text-emerald-600">R$ {stats.totalProfit.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => setShowSummaryModal(false)}
              className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold active:scale-95 transition-transform"
            >
              CONCLUÍDO
            </button>
            <button 
              onClick={clearDay}
              className="w-full py-4 text-red-600 font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <AlertTriangle size={18} /> Limpar Registros de Hoje
            </button>
          </div>
        </div>
      </Modal>

      {/* Custom Dialog (Alert/Confirm) */}
      <Modal 
        isOpen={dialog.isOpen} 
        onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))} 
        title={dialog.title}
      >
        <div className="space-y-6">
          <p className="text-zinc-600 font-medium whitespace-pre-wrap text-center">
            {dialog.message}
          </p>
          <div className="flex gap-3">
            {dialog.type === 'confirm' && (
              <button 
                onClick={() => setDialog(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold active:scale-95 transition-transform"
              >
                CANCELAR
              </button>
            )}
            <button 
              onClick={() => {
                setDialog(prev => ({ ...prev, isOpen: false }));
                dialog.onConfirm?.();
              }}
              className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-bold active:scale-95 transition-transform"
            >
              {dialog.type === 'confirm' ? 'CONFIRMAR' : 'OK'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
