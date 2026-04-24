import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Calendar, Users, Music, CheckCircle, Home, LogOut, Menu, X, Church } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Navigation: React.FC = () => {
  const { profile, churches, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);

  const navItems = [
    { name: 'Início', path: '/', icon: Home },
  ];

  if (profile?.role === 'super_admin') {
    navItems.push(
      { name: 'Igrejas', path: '/churches', icon: Church },
      { name: 'Usuários Globais', path: '/users', icon: Users }
    );
  } else {
    // Member/Admin Church specific items
    navItems.push(
      { name: 'Cultos', path: '/services', icon: Calendar },
      { name: 'Disponibilidade', path: '/availability', icon: CheckCircle },
      { name: 'Escalas', path: '/schedules', icon: Music },
      { name: 'Músicas', path: '/songs', icon: Music }
    );
    
    if (profile?.role === 'admin') {
      navItems.push({ name: 'Integrantes', path: '/users', icon: Users });
    }
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white border-bottom border-gray-200 sticky top-0 z-50">
        <h1 className="text-xl font-bold text-gray-900">Music Planner</h1>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-500">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6">
            <h1 className="text-2xl font-black tracking-tight text-gray-900">MUSIC PLANNER</h1>
            <p className="text-xs font-mono text-gray-400 mt-1 uppercase tracking-widest">Louvor & Escalas</p>
          </div>

          <div className="px-4 mb-6">
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="w-full flex items-center justify-between group cursor-default">
                <div className="text-left overflow-hidden">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Igreja Atual</p>
                  <p className="font-bold text-gray-900 truncate">
                    {churches[profile?.tenant_id || ''] || (profile?.role === 'super_admin' ? 'Global Admin' : 'Nenhuma')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  location.pathname === item.path
                    ? "bg-gray-900 text-white shadow-lg shadow-gray-200"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-4 py-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold border-2 border-white shadow-sm">
                {profile?.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{profile?.name}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{profile?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
            >
              <span className="font-medium">Sair</span>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      <Navigation />
      <main className="lg:ml-64 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
