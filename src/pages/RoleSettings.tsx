import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Shield, Plus, Trash2, Edit2, X, Save, Users as UsersIcon, Settings, ArrowUpDown } from "lucide-react";
import { useAuth } from "../components/AuthContext";

interface RoleHierarchy {
  id: string;
  name: string;
  level: number;
  description: string;
}

interface UserAssignment {
  userId: string;
  roleId: string;
}

export function RoleSettings() {
  const { user, getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');
  
  const [hierarchies, setHierarchies] = useState<RoleHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Users 
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<UserAssignment[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", displayName: "", role: "ResponsableArea" });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    level: 1,
    description: ""
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "hierarchies"), (snapshot) => {
      const data: RoleHierarchy[] = [];
      snapshot.forEach((d) => data.push({ id: d.id, ...d.data() } as RoleHierarchy));
      setHierarchies(data.sort((a, b) => b.level - a.level));
      setLoading(false);
    }, (error) => {
      console.error("error fetching hierarchies", error);
      setLoading(false);
    });
    
    // Listen to assignments
    const unsubAssignments = onSnapshot(collection(db, "user_role_assignments"), (snapshot) => {
      const data: UserAssignment[] = [];
      snapshot.forEach((d) => data.push({ userId: d.id, roleId: d.data().roleId }));
      setAssignments(data);
    });

    fetchUsers();

    return () => {
      unsub();
      unsubAssignments();
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setSystemUsers(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      if (!roleId) {
        await deleteDoc(doc(db, "user_role_assignments", userId.toString()));
      } else {
        await setDoc(doc(db, "user_role_assignments", userId.toString()), {
          roleId,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error("Error assingning role", e);
    }
  };

  const handleUpdateBaseRole = async (userId: string, role: string) => {
    try {
      const token = await getToken();
      await fetch(`/api/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role })
      });
      fetchUsers();
    } catch (e) {
      console.error("error update base role", e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getToken();
      await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });
      fetchUsers();
      setShowUserModal(false);
      setNewUser({ email: "", displayName: "", role: "ResponsableArea" });
    } catch (e) {
      console.error("Error creating user", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, "hierarchies", editingId), formData);
      } else {
        await addDoc(collection(db, "hierarchies"), formData);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ name: "", level: 1, description: "" });
    } catch (e) {
      console.error(e);
      alert("Error en desar el rol.");
    }
  };

  const editRole = (h: RoleHierarchy) => {
    setFormData({ name: h.name, level: h.level, description: h.description });
    setEditingId(h.id);
    setShowModal(true);
  };

  const deleteRole = async (id: string) => {
    if (confirm("N'estàs segur d'eliminar aquest rol?")) {
      try {
        await deleteDoc(doc(db, "hierarchies", id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const [hSort, setHSort] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const handleHSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (hSort.key === key && hSort.direction === 'asc') direction = 'desc';
    setHSort({ key, direction });
  };

  const sortedHierarchies = useMemo(() => {
    let sortable = [...hierarchies];
    if (hSort.key !== null) {
      sortable.sort((a, b) => {
        let valA = a[hSort.key as keyof RoleHierarchy] || '';
        let valB = b[hSort.key as keyof RoleHierarchy] || '';
        if (hSort.key === 'level') {
          valA = Number(valA);
          valB = Number(valB);
        } else {
          valA = String(valA).toLowerCase();
          valB = String(valB).toLowerCase();
        }
        if (valA < valB) return hSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return hSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [hierarchies, hSort]);

  const [uSort, setUSort] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const handleUSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (uSort.key === key && uSort.direction === 'asc') direction = 'desc';
    setUSort({ key, direction });
  };

  const sortedUsers = useMemo(() => {
    let sortable = [...systemUsers];
    if (uSort.key !== null) {
      sortable.sort((a, b) => {
        let valA = String(a[uSort.key!] || '').toLowerCase();
        let valB = String(b[uSort.key!] || '').toLowerCase();
        if (uSort.key === 'roleId') {
           const assignA = assignments.find(x => x.userId === String(a.id))?.roleId || '';
           const assignB = assignments.find(x => x.userId === String(b.id))?.roleId || '';
           valA = assignA.toLowerCase();
           valB = assignB.toLowerCase();
        }
        
        if (valA < valB) return uSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return uSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [systemUsers, uSort, assignments]);

  if (user?.role !== "Gerencia" && user?.role !== "DireccionAdministracion") {
    return (
      <div className="flex flex-col h-full bg-slate-50 p-8">
        <h1 className="text-xl font-bold text-red-600">Accés Denegat</h1>
        <p className="text-slate-500 mt-2">Només els administradors poden veure aquesta pàgina.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0">
        <div className="flex items-center space-x-2 md:space-x-4">
          <span className="text-slate-500 font-medium text-sm md:text-base">Mòduls</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold text-sm md:text-base">Configuració de Rols</span>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="flex bg-slate-100 rounded-lg p-1 mr-4">
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === 'roles' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Definir Jerarquies
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Asignar Usuaris
            </button>
          </div>
          
          {activeTab === 'roles' ? (
            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({ name: "", level: 1, description: "" });
                setShowModal(true);
              }}
              className="px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-xs font-bold text-white shadow-sm transition-colors flex items-center"
            >
              <Plus size={14} className="mr-1" />
              <span className="hidden sm:inline">Definir Jerarquia</span>
              <span className="sm:hidden">Nou</span>
            </button>
          ) : (
            <button 
              onClick={() => setShowUserModal(true)}
              className="px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-xs font-bold text-white shadow-sm transition-colors flex items-center"
            >
              <Plus size={14} className="mr-1" />
              <span className="hidden sm:inline">Nou Usuari</span>
              <span className="sm:hidden">Nou</span>
            </button>
          )}
        </div>
      </header>

      <div className="p-4 md:p-8 flex flex-col space-y-6 flex-1 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col max-w-4xl mx-auto w-full">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
            <h2 className="font-bold text-slate-800 flex items-center">
              {activeTab === 'roles' ? <Shield className="mr-2 text-blue-500" size={20} /> : <UsersIcon className="mr-2 text-blue-500" size={20} />}
              {activeTab === 'roles' ? "Jerarquies del Sistema (Firestore)" : "Asignació de Rols a Usuaris"}
            </h2>
          </div>
          
          {activeTab === 'roles' ? (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase text-slate-500 tracking-wider font-bold border-b border-slate-100">
                    <th className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleHSort('level')}>
                      <div className="flex items-center">Nivell <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                    </th>
                    <th className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleHSort('name')}>
                      <div className="flex items-center">Nom del Rol <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                    </th>
                    <th className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleHSort('description')}>
                      <div className="flex items-center">Descripció <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                    </th>
                    <th className="px-5 py-3 text-right">Accions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr><td colSpan={4} className="p-6 text-center text-slate-400">Carregant...</td></tr>
                  ) : hierarchies.length === 0 ? (
                    <tr><td colSpan={4} className="p-10 text-center text-slate-400">
                      <Shield className="mx-auto text-slate-300 mb-3" size={32} />
                      <p>No hi ha jerarquies definides. Configura-les ara.</p>
                    </td></tr>
                  ) : (
                    sortedHierarchies.map(h => (
                      <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <span className="inline-block px-2 py-1 text-xs font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                           Lv {h.level}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-900">{h.name}</td>
                        <td className="px-5 py-4 text-slate-500">{h.description}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <button onClick={() => editRole(h)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                            <button onClick={() => deleteRole(h.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase text-slate-500 tracking-wider font-bold border-b border-slate-100">
                    <th className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleUSort('email')}>
                      <div className="flex items-center">ID / Correu <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                    </th>
                    <th className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleUSort('displayName')}>
                      <div className="flex items-center">Nom <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                    </th>
                    <th className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleUSort('role')}>
                      <div className="flex items-center">Rol Base de l'App <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                    </th>
                    <th className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleUSort('roleId')}>
                      <div className="flex items-center">Rol Jeràrquic Assignat <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {systemUsers.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-slate-400">No s'han trobat usuaris al sistema.</td></tr>
                  ) : (
                    sortedUsers.map(u => {
                      const userAssignment = assignments.find(a => a.userId === String(u.id));
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-900">{u.email}</div>
                            <div className="text-[10px] text-slate-400 flex items-center mt-1">
                              ID: {u.uid.substring(0, 8)}...
                            </div>
                          </td>
                          <td className="px-5 py-4 font-medium text-slate-700">{u.displayName}</td>
                          <td className="px-5 py-4">
                            <select 
                              value={u.role || "ResponsableArea"}
                              onChange={e => handleUpdateBaseRole(String(u.id), e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="ResponsableArea">Responsable d'Àrea</option>
                              <option value="TecnicaAdministrativa">Tècnica Administrativa</option>
                              <option value="DireccionAdministracion">Direcció d'Administració</option>
                              <option value="ResponsableEquipamientos">Responsable d'Equipaments</option>
                              <option value="AreaContabilidad">Àrea de Comptabilitat</option>
                              <option value="Gerencia">Gerència</option>
                            </select>
                          </td>
                          <td className="px-5 py-4">
                            <select 
                              value={userAssignment?.roleId || ""}
                              onChange={e => handleAssignRole(String(u.id), e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- Sense Rol --</option>
                              {hierarchies.map(h => (
                                <option key={h.id} value={h.id}>{h.name} (Lv {h.level})</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800">Crear Nou Usuari</h2>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Email *</label>
                <input 
                  required
                  type="email"
                  placeholder="correu@somllar.org"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Nom *</label>
                <input 
                  required
                  type="text"
                  placeholder="Nom complet"
                  value={newUser.displayName}
                  onChange={e => setNewUser({ ...newUser, displayName: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Rol Base Inicial</label>
                <select 
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ResponsableArea">Responsable d'Àrea</option>
                  <option value="TecnicaAdministrativa">Tècnica Administrativa</option>
                  <option value="DireccionAdministracion">Direcció d'Administració</option>
                  <option value="ResponsableEquipamientos">Responsable d'Equipaments</option>
                  <option value="AreaContabilidad">Àrea de Comptabilitat</option>
                  <option value="Gerencia">Gerència</option>
                </select>
              </div>
              
              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm font-bold text-slate-700 transition-colors"
                >
                  Cancel·lar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-bold text-white shadow-sm transition-colors flex items-center"
                >
                  <Save size={16} className="mr-2" />
                  Crear Usuari
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800">{editingId ? "Editar Jerarquia" : "Nova Jerarquia"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Nom del Rol *</label>
                <input 
                  required
                  type="text"
                  placeholder="Ex: Sol·licitant, Revisor, Aprovador"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Nivell d'Autoritat (Més alt = + poder) *</label>
                <input 
                  required
                  type="number"
                  min="1"
                  max="10"
                  value={formData.level}
                  onChange={e => setFormData({ ...formData, level: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Descripció</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Què pot fer aquest rol?"
                />
              </div>
              
              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm font-bold text-slate-700 transition-colors"
                >
                  Cancel·lar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-bold text-white shadow-sm transition-colors flex items-center"
                >
                  <Save size={16} className="mr-2" />
                  {editingId ? 'Desar Canvis' : 'Crear Jerarquia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
