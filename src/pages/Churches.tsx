import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, updateDoc, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { db, auth as mainAuth } from '../lib/firebase';
import { Church, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  Church as ChurchIcon, Plus, UserPlus, Shield, AlertCircle, Loader2, X, 
  CheckCircle2, MapPin, Search, Edit2, Power, Building2, Users 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Churches: React.FC = () => {
  const [churches, setChurches] = useState<Church[]>([]);
  const [churchAdmins, setChurchAdmins] = useState<Record<string, User[]>>({});
  const [loading, setLoading] = useState(true);
  const [showChurchModal, setShowChurchModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingChurch, setEditingChurch] = useState<Church | null>(null);
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Church Form
  const [churchForm, setChurchForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: ''
  });
  
  // Admin Form
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { profile } = useAuth();

  useEffect(() => {
    fetchChurches();
    fetchAdmins();
  }, []);

  const fetchChurches = async () => {
    try {
      const q = query(collection(db, 'churches'));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Church));
      setChurches(docs);
    } catch (err) {
      console.error("Error fetching churches:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'admin'));
      const querySnapshot = await getDocs(q);
      const adminsMap: Record<string, User[]> = {};
      
      querySnapshot.docs.forEach(doc => {
        const user = { id: doc.id, ...doc.data() } as User;
        if (!adminsMap[user.tenant_id]) {
          adminsMap[user.tenant_id] = [];
        }
        adminsMap[user.tenant_id].push(user);
      });
      
      setChurchAdmins(adminsMap);
    } catch (err) {
      console.error("Error fetching admins:", err);
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    
    // Mask: 00000-000
    let masked = value;
    if (value.length > 5) {
      masked = `${value.slice(0, 5)}-${value.slice(5)}`;
    }
    
    setChurchForm(prev => ({ ...prev, zip_code: masked }));

    if (value.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${value}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setChurchForm(prev => ({
            ...prev,
            address: `${data.logradouro}${data.bairro ? `, ${data.bairro}` : ''}`,
            city: data.localidade,
            state: data.uf
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  const handleChurchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError('');

    try {
      if (editingChurch) {
        const churchRef = doc(db, 'churches', editingChurch.id);
        await updateDoc(churchRef, {
          ...churchForm
        });
        setSuccessMessage('Igreja atualizada com sucesso!');
      } else {
        const tenantId = `church_${Math.random().toString(36).substring(2, 9)}`;
        await setDoc(doc(db, 'churches', tenantId), {
          ...churchForm,
          tenant_id: tenantId,
          status: 'active'
        });
        setSuccessMessage('Instituição registrada com sucesso!');
      }
      
      resetChurchForm();
      setShowChurchModal(false);
      fetchChurches();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setError("Erro ao salvar igreja. Verifique permissões.");
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleStatus = async (church: Church) => {
    const newStatus = church.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'churches', church.id), {
        status: newStatus
      });
      fetchChurches();
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChurch) return;
    
    setProcessing(true);
    setError('');

    try {
      const secondaryApp = getApps().find(app => app.name === 'Secondary') || initializeApp(firebaseConfig, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, adminForm.email, adminForm.password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, 'users', uid), {
        name: adminForm.name,
        email: adminForm.email,
        role: 'admin',
        tenant_id: selectedChurch.tenant_id,
        mustChangePassword: true,
        createdAt: new Date().toISOString()
      });

      await secondaryAuth.signOut();

      setAdminForm({ name: '', email: '', password: '' });
      setShowAdminModal(false);
      setSuccessMessage(`Administrador criado para ${selectedChurch.name}`);
      fetchAdmins();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setError(err.message || "Erro ao criar administrador.");
    } finally {
      setProcessing(false);
    }
  };

  const resetChurchForm = () => {
    setChurchForm({
      name: '',
      address: '',
      city: '',
      state: '',
      zip_code: ''
    });
    setEditingChurch(null);
  };

  const openEditChurch = (church: Church) => {
    setEditingChurch(church);
    setChurchForm({
      name: church.name,
      address: church.address || '',
      city: church.city || '',
      state: church.state || '',
      zip_code: church.zip_code || ''
    });
    setShowChurchModal(true);
  };

  const filteredChurches = churches.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.zip_code?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: churches.length,
    active: churches.filter(c => c.status === 'active').length,
    inactive: churches.filter(c => c.status === 'inactive').length
  };

  if (profile?.role !== 'super_admin') {
    return <div className="p-8 text-center text-red-500 font-bold">Acesso restrito ao Super Administrador.</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight">Igrejas</h1>
          <p className="text-gray-500 font-mono text-sm tracking-widest mt-1 uppercase">Gestão Global da Plataforma</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <div className="bg-white border border-gray-100 px-4 py-2 rounded-2xl shadow-sm text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase">Ativas</p>
              <p className="text-xl font-black text-green-600">{stats.active}</p>
            </div>
            <div className="bg-white border border-gray-100 px-4 py-2 rounded-2xl shadow-sm text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase">Inativas</p>
              <p className="text-xl font-black text-gray-400">{stats.inactive}</p>
            </div>
          </div>
          <button 
            onClick={() => { resetChurchForm(); setShowChurchModal(true); }}
            className="px-6 py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200"
          >
            <Plus size={20} />
            Nova Igreja
          </button>
        </div>
      </div>

      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100 flex items-center gap-3 font-bold"
          >
            <CheckCircle2 size={24} />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text"
            placeholder="Nome, Cidade ou CEP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border-none rounded-2xl outline-none font-medium"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map((stat) => (
            <button
              key={stat}
              onClick={() => setStatusFilter(stat as any)}
              className={`px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${
                statusFilter === stat 
                ? 'bg-gray-900 text-white shadow-lg' 
                : 'bg-gray-50 text-gray-400 hover:text-gray-600'
              }`}
            >
              {stat === 'all' ? 'Tudo' : stat === 'active' ? 'Ativas' : 'Inativas'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-gray-400" size={48} />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-8">
          {filteredChurches.map((church) => {
            const admins = churchAdmins[church.tenant_id] || [];
            return (
              <motion.div 
                key={church.id}
                layout
                className={`bg-white rounded-[2.5rem] border shadow-sm flex flex-col h-full overflow-hidden transition-all ${
                  church.status === 'active' ? 'border-gray-100 hover:shadow-xl' : 'border-red-100 grayscale opacity-80'
                }`}
              >
                <div className="p-8 space-y-6 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className={`p-4 rounded-2xl ${church.status === 'active' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                        <Building2 size={32} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-tight">{church.name}</h3>
                        <div className="flex items-center gap-2 mt-1 text-gray-400">
                          <MapPin size={14} />
                          <span className="text-xs font-medium">
                            {church.city ? `${church.city}, ${church.state}` : 'Sem endereço configurado'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                         church.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                       }`}>
                        {church.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tenant ID</p>
                      <p className="text-sm font-mono font-bold text-gray-700">{church.tenant_id}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">CEP</p>
                      <p className="text-sm font-bold text-gray-700">{church.zip_code || '---'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Users size={12} /> Administradores ({admins.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {admins.length > 0 ? admins.map(adm => (
                        <div key={adm.id} className="bg-gray-100 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 border border-gray-200">
                          {adm.name}
                        </div>
                      )) : (
                        <p className="text-xs text-gray-400 italic">Nenhum administrador vinculado.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-50 flex items-center gap-3">
                  <button 
                    onClick={() => { setSelectedChurch(church); setShowAdminModal(true); }}
                    className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                  >
                    <UserPlus size={18} />
                    Adm
                  </button>
                  <button 
                    onClick={() => openEditChurch(church)}
                    className="p-3.5 bg-white border border-gray-200 text-gray-600 rounded-2xl hover:border-gray-400 transition-all shadow-sm"
                    title="Editar Detalhes"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleToggleStatus(church)}
                    className={`p-3.5 border rounded-2xl transition-all shadow-sm ${
                      church.status === 'active' 
                      ? 'bg-white border-red-100 text-red-500 hover:bg-red-50' 
                      : 'bg-green-600 border-green-600 text-white hover:bg-green-700'
                    }`}
                    title={church.status === 'active' ? 'Desativar Igreja' : 'Ativar Igreja'}
                  >
                    <Power size={18} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal Igreja (Nova ou Edição) */}
      <AnimatePresence>
        {showChurchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChurchModal(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-10 overflow-y-auto max-h-[90vh]"
            >
              <h2 className="text-3xl font-black text-gray-900 mb-8 uppercase tracking-tight">
                {editingChurch ? 'Editar Instituição' : 'Nova Instituição'}
              </h2>
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm flex items-center gap-3 border border-red-100">
                  <AlertCircle size={20} /> {error}
                </div>
              )}

              <form onSubmit={handleChurchSubmit} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome da Igreja</label>
                  <input
                    type="text"
                    value={churchForm.name}
                    onChange={(e) => setChurchForm({...churchForm, name: e.target.value})}
                    placeholder="Ex: Igreja Batista Central"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                  <input
                    type="text"
                    value={churchForm.address}
                    onChange={(e) => setChurchForm({...churchForm, address: e.target.value})}
                    placeholder="Rua, Número, Bairro"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cidade</label>
                    <input
                      type="text"
                      value={churchForm.city}
                      onChange={(e) => setChurchForm({...churchForm, city: e.target.value})}
                      placeholder="Cidade"
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estado</label>
                    <input
                      type="text"
                      value={churchForm.state}
                      onChange={(e) => setChurchForm({...churchForm, state: e.target.value})}
                      placeholder="UF"
                      maxLength={2}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-medium uppercase text-center"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CEP</label>
                  <input
                    type="text"
                    value={churchForm.zip_code}
                    onChange={handleCepChange}
                    placeholder="00000-000"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-medium"
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowChurchModal(false)}
                    className="flex-1 py-4 text-gray-400 font-bold hover:text-gray-600 transition-all"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-50 shadow-xl shadow-gray-100"
                  >
                    {processing ? 'Salvando...' : editingChurch ? 'Salvar Alterações' : 'Registrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Criar Admin (Mantido conforme anterior, mas com estilo unificado) */}
      <AnimatePresence>
        {showAdminModal && selectedChurch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdminModal(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10">
              <div className="flex justify-between items-center mb-10">
                <div>
                   <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Vincular Admin</h2>
                   <p className="text-sm font-medium text-blue-600">{selectedChurch.name}</p>
                </div>
                <button onClick={() => setShowAdminModal(false)} className="p-3 hover:bg-gray-50 rounded-full transition-all"><X size={20} className="text-gray-400" /></button>
              </div>

              <form onSubmit={handleCreateAdmin} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input type="text" value={adminForm.name} onChange={(e) => setAdminForm({...adminForm, name: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
                  <input type="email" value={adminForm.email} onChange={(e) => setAdminForm({...adminForm, email: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha Inicial</label>
                  <input type="password" value={adminForm.password} onChange={(e) => setAdminForm({...adminForm, password: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" required />
                </div>
                <button type="submit" disabled={processing} className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black text-lg hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50">
                  {processing ? <Loader2 className="animate-spin" /> : <UserPlus size={22} />} {processing ? 'Registrando...' : 'Confirmar e Vincular'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Churches;
