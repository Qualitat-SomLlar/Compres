import React, { useState, useEffect } from "react";
import { Plus, X, Save, ArrowRight, Trash2, GitPullRequest, Edit2 } from "lucide-react";
import { useAuth } from "../components/AuthContext";

type Category = {
  id: number;
  name: string;
  description: string;
};

type WorkflowStep = {
  id: number;
  workflowId: number;
  stepOrder: number;
  requiredRole: string;
  actionName: string;
};

type Workflow = {
  id: number;
  name: string;
  categoryId: number;
  description: string;
  steps: WorkflowStep[];
};

const ROLES = [
  { id: "ResponsableArea", label: "Responsable d'Àrea" },
  { id: "TecnicaAdministrativa", label: "Tècnica Administrativa" },
  { id: "ResponsableEquipamientos", label: "Responsable d'Equipaments" },
  { id: "DireccionAdministracion", label: "Direcció d'Administració" },
  { id: "AreaContabilidad", label: "Àrea de Comptabilitat" },
  { id: "Gerencia", label: "Gerència" }
];

export function Workflows() {
  const { getToken, user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals state
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [newCat, setNewCat] = useState({ name: "", description: "" });
  
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [editingWfId, setEditingWfId] = useState<number | null>(null);
  const [newWorkflow, setNewWorkflow] = useState({ name: "", description: "", categoryId: "" });
  
  const [showStepModal, setShowStepModal] = useState<{workflowId: number} | null>(null);
  const [newStep, setNewStep] = useState({ actionName: "", requiredRole: "ResponsableArea" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      
      const [catRes, wfRes] = await Promise.all([
        fetch("/api/categories", { headers }),
        fetch("/api/workflows", { headers })
      ]);
      
      if (catRes.ok) setCategories(await catRes.json());
      if (wfRes.ok) setWorkflows(await wfRes.json());
      
      setIsLoading(false);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getToken();
      const url = editingCatId ? `/api/categories/${editingCatId}` : "/api/categories";
      const method = editingCatId ? "PUT" : "POST";
      
      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newCat)
      });
      fetchData();
      setShowCatModal(false);
      setEditingCatId(null);
      setNewCat({ name: "", description: "" });
    } catch (e) {
      console.error("Error", e);
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getToken();
      const url = editingWfId ? `/api/workflows/${editingWfId}` : "/api/workflows";
      const method = editingWfId ? "PUT" : "POST";
      
      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...newWorkflow, categoryId: parseInt(newWorkflow.categoryId) })
      });
      fetchData();
      setShowWorkflowModal(false);
      setEditingWfId(null);
      setNewWorkflow({ name: "", description: "", categoryId: "" });
    } catch (e) {
      console.error("Error", e);
    }
  };

  const handleCreateStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showStepModal) return;
    try {
      const token = await getToken();
      const workflow = workflows.find(w => w.id === showStepModal.workflowId);
      const stepOrder = workflow ? workflow.steps.length + 1 : 1;
      
      await fetch(`/api/workflows/${showStepModal.workflowId}/steps`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...newStep, stepOrder })
      });
      fetchData();
      setShowStepModal(null);
      setNewStep({ actionName: "", requiredRole: "ResponsableArea" });
    } catch (e) {
      console.error("Error", e);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Eliminar categoria? S'eliminaran també els fluxos associats a ella.")) return;
    try {
      const token = await getToken();
      await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (e) {
      console.error("Error", e);
    }
  };

  const handleDeleteWorkflow = async (id: number) => {
    if (!confirm("Eliminar flux i tots els seus passos?")) return;
    try {
      const token = await getToken();
      await fetch(`/api/workflows/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (e) {
      console.error("Error", e);
    }
  };

  const handleDeleteStep = async (stepId: number) => {
    if (!confirm("Eliminar pas del flux?")) return;
    try {
      const token = await getToken();
      await fetch(`/api/workflow-steps/${stepId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (e) {
      console.error("Error", e);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Cargando flujos...</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <GitPullRequest className="mr-2 text-blue-600" size={24} />
            Categories i Fluxos d'Aprovació
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configura els diferents procediments segons el tipus de compra</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => {
              setEditingCatId(null);
              setNewCat({ name: "", description: "" });
              setShowCatModal(true);
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm font-bold text-slate-700 transition-colors"
          >
            + Nova Categoria
          </button>
          <button 
            onClick={() => {
              setEditingWfId(null);
              setNewWorkflow({ name: "", description: "", categoryId: "" });
              setShowWorkflowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-bold text-white shadow-sm transition-colors"
          >
            + Nou Flux
          </button>
        </div>
      </header>

      {/* Categories preview */}
      <section>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Categories de Sol·licitud ({categories.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.length === 0 ? (
             <div className="md:col-span-3 p-6 text-center text-slate-400 bg-white border border-slate-200 rounded-xl border-dashed">
               No hi ha categories definides.
             </div>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-800">{cat.name}</h3>
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={() => {
                        setEditingCatId(cat.id);
                        setNewCat({ name: cat.name, description: cat.description || "" });
                        setShowCatModal(true);
                      }}
                      className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">{cat.description || "Sense descripció"}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Workflows */}
      <section className="space-y-6">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Fluxos Configurat ({workflows.length})</h2>
        
        {workflows.length === 0 ? (
           <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-xl border-dashed">
             Crea un flux d'aprovació per començar a definir passos.
           </div>
        ) : (
          workflows.map(wf => (
            <div key={wf.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden group">
              <div className="border-b border-slate-100 bg-slate-50/50 p-4 md:px-6 flex justify-between items-center relative">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-lg text-slate-800">{wf.name}</h3>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider">
                      {categories.find(c => c.id === wf.categoryId)?.name || "General"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{wf.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => {
                      setEditingWfId(wf.id);
                      setNewWorkflow({ name: wf.name, description: wf.description || "", categoryId: wf.categoryId.toString() });
                      setShowWorkflowModal(true);
                    }}
                    className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteWorkflow(wf.id)}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button 
                    onClick={() => setShowStepModal({ workflowId: wf.id })}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold text-slate-700 transition-colors"
                  >
                    + Afegir Pas
                  </button>
                </div>
              </div>
              
              <div className="p-4 md:px-6">
                {wf.steps && wf.steps.length > 0 ? (
                  <div className="flex flex-col space-y-2">
                    {wf.steps.sort((a,b) => a.stepOrder - b.stepOrder).map((step, index) => (
                      <div key={step.id} className="flex items-center group">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100">
                          {step.stepOrder}
                        </div>
                        <div className="ml-4 flex-1 bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center transition-all group-hover:border-blue-200 shadow-sm relative">
                          <div>
                            <p className="font-bold text-sm text-slate-800">{step.actionName}</p>
                            <p className="text-xs text-slate-500 flex items-center mt-0.5">
                              <span className="bg-slate-100 text-slate-600 px-1.5 rounded mr-1">Ròl Fix:</span> 
                              {ROLES.find(r => r.id === step.requiredRole)?.label || step.requiredRole}
                            </p>
                          </div>
                          <button 
                            onClick={() => handleDeleteStep(step.id)}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {index < wf.steps.length - 1 && (
                          <div className="mx-2 text-slate-300">
                            <ArrowRight size={16} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-slate-400 italic">
                    No hi ha cap pas definit en aquest flux. S'aprovarà directament.
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </section>

      {/* modals */}
      {showCatModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Nova Categoria de Sol·licitud</h2>
              <button onClick={() => setShowCatModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateCategory} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Nom Categoria</label>
                <input required type="text" placeholder="Ex: Compra Material Informàtic" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Descripció</label>
                <input type="text" placeholder="Breu explicació..." value={newCat.description} onChange={e => setNewCat({...newCat, description: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="pt-4 flex justify-end">
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-bold text-white shadow-sm transition-colors">Crear Categoria</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWorkflowModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Nou Flux d'Aprovació</h2>
              <button onClick={() => setShowWorkflowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateWorkflow} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Nom del Flux</label>
                <input required type="text" placeholder="Ex: Aprovació Material > 500€" value={newWorkflow.name} onChange={e => setNewWorkflow({...newWorkflow, name: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Categoria Associada</label>
                <select required value={newWorkflow.categoryId} onChange={e => setNewWorkflow({...newWorkflow, categoryId: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Selecciona Categoria --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Descripció</label>
                <input type="text" placeholder="Detalls addicionals..." value={newWorkflow.description} onChange={e => setNewWorkflow({...newWorkflow, description: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="pt-4 flex justify-end">
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-bold text-white shadow-sm transition-colors">Crear Flux</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStepModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Afegir Pas al Flux</h2>
              <button onClick={() => setShowStepModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateStep} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Nom de l'Acció (Què cal fer?)</label>
                <input required type="text" placeholder="Ex: Validació Pressupostària" value={newStep.actionName} onChange={e => setNewStep({...newStep, actionName: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Rol Necessari per Aprovar</label>
                <select required value={newStep.requiredRole} onChange={e => setNewStep({...newStep, requiredRole: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              <div className="pt-4 flex justify-end">
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-bold text-white shadow-sm transition-colors">Afegir Pas</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
