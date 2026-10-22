import { useState } from 'react';
import { Users, GitMerge, Bell, FileSpreadsheet, Settings, ShieldCheck, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { TabButton } from './TabButton';
import { UsersManager } from './UsersManager';
import { AreasManager } from './AreasManager';
import { HierarchyLevelsManager } from './HierarchyLevelsManager';
import { FlowsManager } from './FlowsManager';
import { NotificationsManager } from './NotificationsManager';
import { ImportsManager } from './ImportsManager';
import { SuperManager } from './SuperManager';

type AdminTab = 'users' | 'areas' | 'hierarchy' | 'flows' | 'notifications' | 'imports' | 'super';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UsersManager />;
      case 'areas':
        return <AreasManager />;
      case 'hierarchy':
        return <HierarchyLevelsManager />;
      case 'flows':
        return <FlowsManager />;
      case 'notifications':
        return <NotificationsManager />;
      case 'imports':
        return <ImportsManager />;
      case 'super':
        return <SuperManager />;
      default:
        return <UsersManager />;
    }
  };

  const { user } = useAuth();
  const isSuper = user?.role === 'superadmin';

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary">
              <Settings size={20} />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter">Administració del Sistema</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium max-w-xl">Gestiona el directori de treballadors/usuaris, el catàleg d'àrees corporatives, els nivells de jerarquia i la configuració global.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 p-1 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
          <TabButton 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')} 
            icon={<Users size={16} />}
            label="Treballadors"
          />
          <TabButton 
            active={activeTab === 'areas'} 
            onClick={() => setActiveTab('areas')} 
            icon={<Building2 size={16} />}
            label="Àrees de Treball"
          />
          <TabButton 
            active={activeTab === 'hierarchy'} 
            onClick={() => setActiveTab('hierarchy')} 
            icon={<ShieldCheck size={16} />}
            label="Nivells Jeràrquics"
          />
          <TabButton 
            active={activeTab === 'flows'} 
            onClick={() => setActiveTab('flows')} 
            icon={<GitMerge size={16} />}
            label="Fluxos"
          />
          <TabButton 
            active={activeTab === 'notifications'} 
            onClick={() => setActiveTab('notifications')} 
            icon={<Bell size={16} />}
            label="Notificacions"
          />
          <TabButton 
            active={activeTab === 'imports'} 
            onClick={() => setActiveTab('imports')} 
            icon={<FileSpreadsheet size={16} />}
            label="Imports"
          />
          {isSuper && (
            <TabButton 
              active={activeTab === 'super'} 
              onClick={() => setActiveTab('super')} 
              icon={<ShieldCheck size={16} />}
              label="Super"
            />
          )}
        </div>
      </div>

      <div className="card">
        {renderTabContent()}
      </div>
    </div>
  );
}
