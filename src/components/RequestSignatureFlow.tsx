import { Clock } from 'lucide-react';
import { PurchaseRequest } from '../types';
import { TimelineStep } from './TimelineStep';

interface RequestSignatureFlowProps {
  request: PurchaseRequest;
  financeLabel: string;
  areaDirectorsLabel: string;
  areaCoordinatorsLabel: string;
}

export function RequestSignatureFlow({ request, financeLabel, areaDirectorsLabel, areaCoordinatorsLabel }: RequestSignatureFlowProps) {
  return (
    <div className="card p-10 bg-brand-primary/[0.02] border-brand-primary/20">
      <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
        <Clock size={18} /> Flux de Signatures
      </h4>
      <div className="space-y-10 relative ml-4 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-brand-primary/20">
        <TimelineStep 
          title="Tancament" 
          status={request.status === 'tancada' ? 'completed' : 'pending'} 
          role="Facturació i Arxiu" 
          date={request.closedAt ? new Date(request.closedAt).toLocaleDateString('ca-ES') : undefined}
          active={request.status === 'rebuda'} 
        />
        <TimelineStep 
          title="Recepció" 
          status={request.receivedAt || ['rebuda', 'tancada'].includes(request.status) ? 'completed' : 'pending'} 
          role="Conformitat del Bé / Servei" 
          date={request.receivedAt ? new Date(request.receivedAt).toLocaleDateString('ca-ES') : undefined}
          active={request.status === 'comanda_emesa'} 
        />
        <TimelineStep 
          title="Comanda" 
          status={['comanda_emesa', 'rebuda', 'tancada'].includes(request.status) ? 'completed' : 'pending'} 
          role="Emissió de Comanda" 
          active={request.status === 'aprovada'} 
        />
        <TimelineStep 
          title="Finances" 
          status={request.financeApprovedAt || ['aprovada', 'comanda_emesa', 'rebuda', 'tancada'].includes(request.status) ? 'completed' : request.status === 'rebutjada' ? 'error' : 'pending'} 
          role={financeLabel} 
          date={request.financeApprovedAt ? new Date(request.financeApprovedAt).toLocaleDateString('ca-ES') : undefined}
          active={request.status === 'pendent_finances'} 
        />
        <TimelineStep 
          title="Direcció Àrea" 
          status={request.areaDirectionApprovedAt || ['pendent_finances', 'aprovada', 'comanda_emesa', 'rebuda', 'tancada'].includes(request.status) ? 'completed' : request.status === 'rebutjada' ? 'error' : 'pending'} 
          role={areaDirectorsLabel} 
          date={request.areaDirectionApprovedAt ? new Date(request.areaDirectionApprovedAt).toLocaleDateString('ca-ES') : undefined}
          active={request.status === 'pendent_direccio'} 
        />
        <TimelineStep 
          title="Coordinació" 
          status={request.coordinationApprovedAt || ['pendent_direccio', 'pendent_finances', 'aprovada', 'comanda_emesa', 'rebuda', 'tancada'].includes(request.status) ? 'completed' : request.status === 'rebutjada' ? 'error' : 'pending'} 
          role={areaCoordinatorsLabel} 
          date={request.coordinationApprovedAt ? new Date(request.coordinationApprovedAt).toLocaleDateString('ca-ES') : undefined}
          active={request.status === 'pendent_coordinacio'} 
        />
        <TimelineStep 
          title="Sol·licitud" 
          status="completed" 
          role={request.requestingTechnicianName || 'Sol·licitant'} 
          date={request.createdAt ? new Date(request.createdAt).toLocaleDateString('ca-ES') : 'Recent'}
        />
      </div>
    </div>
  );
}
