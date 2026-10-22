import { useState } from 'react';
import { Users, Upload, Download, AlertCircle, ShieldCheck } from 'lucide-react';
import { useUsers } from '../../hooks/useUsers';
import { useAreas } from '../../hooks/useAreas';
import { useHierarchyLevels } from '../../hooks/useHierarchyLevels';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { normalizeAreaId } from '../../constants';
import { HierarchyLevel } from '../../types';
import { importExportService } from '../../services/importExportService';
import { useCenters } from '../../hooks/useCenters';
import { useAnalyticCodes } from '../../hooks/useAnalyticCodes';
import { useSuppliers } from '../../hooks/useSuppliers';

export function ImportsManager() {
  const { addUser } = useUsers();
  const { addSupplier } = useSuppliers();
  const { addCenter } = useCenters();
  const { addAnalyticCode } = useAnalyticCodes();
  const { getAreaName } = useAreas();
  const { getHierarchyRole } = useHierarchyLevels();
  const [isImporting, setIsImporting] = useState(false);

  const entities = [
    { id: 'supplier', name: 'Proveïdors', icon: <Users size={18} /> },
    { id: 'user', name: 'Usuaris', icon: <Users size={18} /> },
    { id: 'center', name: 'Centres de Destí', icon: <ShieldCheck size={18} /> },
    { id: 'analyticCode', name: 'Codis Analítics', icon: <ShieldCheck size={18} /> },
  ];

  const handleDownloadTemplate = (id: string) => {
    importExportService.downloadTemplate(id);
  };

  const handleImport = async (entityId: string, file: File) => {
    setIsImporting(true);
    const loadingToast = toast.loading(`Processant importació de ${entityId}...`);

    try {
      const rawData = await importExportService.processFile(file);
      
      // Filtrem les files que no són dades reals (exemple i instruccions)
      // Normalment l'exemple té dades conegudes o podem filtrar si alguna columna clau conté "Exemple"
      const dataRows = rawData.filter((row: any) => {
        const rowValues = Object.values(row).join(' ').toLowerCase();
        return !rowValues.includes('exemple') && !rowValues.includes('important: esborra');
      });

      if (dataRows.length === 0) {
        toast.error("No s'han trobat dades vàlides per importar (recorda esborrar la fila d'exemple).", { id: loadingToast });
        return;
      }

      let successCount = 0;

      for (const row of dataRows) {
        try {
          if (entityId === 'user') {
            const rawRole = row['Rol Flux'] || 'tecnic';
            const roleCfg = getHierarchyRole(rawRole);
            const rawArea = normalizeAreaId(row['Àrea'] || 'social');
            await addUser({
              name: `${row['Nom'] || ''} ${row['Cognoms'] || ''}`.trim(),
              firstName: row['Nom'] || '',
              lastName: row['Cognoms'] || '',
              email: row['Email'] || '',
              areaId: rawArea,
              areaName: getAreaName(rawArea),
              role: roleCfg.key as any,
              hierarchyLevel: roleCfg.level as HierarchyLevel,
              active: (row['Actiu'] || 'Si').toLowerCase() === 'si',
              notificationsEnabled: (row['Notificacions'] || 'Si').toLowerCase() === 'si'
            });
          } else if (entityId === 'supplier') {
            const rawStatus = (row['Estat'] || '').toLowerCase();
            const validStatus = ['homologat', 'candidat', 'pendent_documentacio', 'en_revisio', 'bloquejat', 'baixa'].includes(rawStatus)
              ? rawStatus as any
              : (row['Homologat'] || 'Si').toLowerCase() === 'si' ? 'homologat' : 'candidat';

            await addSupplier({
              name: row['Nom'] || '',
              nif: row['NIF'] || '',
              category: row['Categoria'] || 'Serveis Generals',
              status: validStatus,
              rating: parseInt(row['Puntuació']) || 80,
              criticality: ['baixa', 'mitjana', 'alta'].includes((row['Criticitat'] || '').toLowerCase()) ? (row['Criticitat'] || '').toLowerCase() as any : 'mitjana',
              documents: []
            });
          } else if (entityId === 'center') {
            await addCenter({
              name: row['Nom'] || '',
              code: row['Codi'] || '',
              type: row['Tipus'] || '',
              address: row['Adreça'] || '',
              city: row['Ciutat'] || '',
              area: (row['Àrea'] || 'social').toLowerCase(),
              active: (row['Actiu'] || 'Si').toLowerCase() === 'si'
            });
          } else if (entityId === 'analyticCode') {
            await addAnalyticCode({
              code: row['Codi Analític'] || '',
              description: row['Descripció'] || '',
              projectId: row['Projecte'] || '',
              area: (row['Àrea'] || 'admin').toLowerCase(),
              active: (row['Actiu'] || 'Si').toLowerCase() === 'si'
            });
          }
          successCount++;
        } catch (err) {
          console.error(`Error a la fila:`, row, err);
        }
      }

      toast.success(`S'han importat ${successCount} registres de ${entityId} correctament.`, { id: loadingToast });
    } catch (err) {
      toast.error("Error processant el fitxer. Assegura't que és un CSV o Excel vàlid.", { id: loadingToast });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-8 space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Importació Massiva i Plantilles</h3>
            <p className="text-xs text-slate-600 font-medium">Descarrega les plantilles, omple-les respectant la fila d'exemple, i <strong>guarda el fitxer resultant en format CSV (.csv)</strong> abans de pujar-lo per garantir una importació perfecta.</p>
          </div>

          <div className="space-y-3">
            {entities.map(entity => (
              <div key={entity.id} className="flex items-center justify-between p-4 bg-[#0b0f19] border border-white/5 rounded-2xl group hover:border-brand-primary/50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-xl text-slate-500 group-hover:text-brand-primary">
                    {entity.icon}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">{entity.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDownloadTemplate(entity.id)}
                    className="p-2 text-slate-500 hover:text-brand-primary transition-colors flex items-center gap-2"
                    title="Descarrega Plantilla"
                    disabled={isImporting}
                  >
                    <Download size={16} />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Plantilla</span>
                  </button>
                  <label className={cn(
                    "cursor-pointer p-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all",
                    isImporting && "opacity-50 cursor-not-allowed"
                  )}>
                    <Upload size={16} />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".csv,.xlsx,.xls"
                      disabled={isImporting}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImport(entity.id, file);
                        e.target.value = ''; // Reset input
                      }} 
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 bg-brand-primary/[0.02] border border-brand-primary/10 rounded-3xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
              <AlertCircle size={18} />
            </div>
            <h4 className="text-xs font-black text-white uppercase tracking-widest">Guia d'Importació</h4>
          </div>
          <ul className="space-y-4">
            <li className="flex gap-3 text-xs text-slate-400 leading-relaxed">
              <div className="shrink-0 w-5 h-5 bg-white/5 rounded-full flex items-center justify-center text-[10px] font-bold">1</div>
              <span>Descarrega la plantilla específica per a l'entitat que vols carregar.</span>
            </li>
            <li className="flex gap-3 text-xs text-slate-400 leading-relaxed">
              <div className="shrink-0 w-5 h-5 bg-white/5 rounded-full flex items-center justify-center text-[10px] font-bold">2</div>
              <span>Omple les files respectant les capçaleres i el format de cada columna.</span>
            </li>
            <li className="flex gap-3 text-xs text-slate-400 leading-relaxed">
              <div className="shrink-0 w-5 h-5 bg-white/5 rounded-full flex items-center justify-center text-[10px] font-bold">3</div>
              <span>Puja el fitxer. El sistema validarà l'estructura abans d'escriure a la base de dades.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
