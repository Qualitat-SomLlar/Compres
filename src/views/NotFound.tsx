import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 animate-in fade-in zoom-in-95 duration-700">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-brand-primary/20 blur-3xl rounded-full"></div>
        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white/[0.02] border border-white/10 rounded-3xl flex items-center justify-center relative z-10 mx-auto shadow-2xl">
          <AlertCircle size={48} className="text-brand-primary sm:w-16 sm:h-16" />
        </div>
      </div>
      
      <h1 className="text-5xl sm:text-7xl font-black text-white mb-4 tracking-tighter">404</h1>
      <h2 className="text-xl sm:text-3xl font-bold text-slate-300 mb-6 tracking-tight">S'ha perdut el fil...</h2>
      <p className="text-slate-500 font-medium max-w-md mb-10 leading-relaxed text-sm sm:text-base">
        Sembla que la pàgina que busques no existeix, ha estat moguda o t'has equivocat d'enllaç. Torna a l'inici per reprendre la gestió.
      </p>
      
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
        <button 
          onClick={() => navigate(-1)} 
          className="btn-secondary py-3 px-8 text-xs font-black uppercase tracking-widest flex items-center gap-3 w-full sm:w-auto justify-center border-white/10 text-slate-300 hover:text-white"
        >
          <ArrowLeft size={16} />
          Tornar Enrere
        </button>
        <Link 
          to="/" 
          className="btn-primary py-3 px-8 text-xs font-black uppercase tracking-widest flex items-center gap-3 w-full sm:w-auto justify-center"
        >
          <Home size={16} />
          Anar a l'Inici
        </Link>
      </div>
    </div>
  );
}
