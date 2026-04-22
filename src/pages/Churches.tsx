import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { db, auth as mainAuth } from '../lib/firebase';
import { Church } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Church as ChurchIcon, Plus, UserPlus, Shield, AlertCircle, Loader2, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Churches: React.FC = () => {
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChurchModal, setShowChurchModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  
  // Church Form
  const [newChurchName, setNewChurchName] = useState('');
  
  // Admin Form
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { profile } = useAuth();

  useEffect(() => {
    fetchChurches();
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

  const handleCreateChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError('');
    const tenantId = `church_${Math.random().toString(36).substring(2, 9)}`;

    try {
      await setDoc(doc(db, 'churches', tenantId), {
        name: newChurchName,
        tenant_id: tenantId,
        status: 'active'
      });
      
      setNewChurchName('');
      setShowChurchModal(false);
      fetchChurches();
    } catch (err: any) {
      setError("Erro ao criar igreja. Verifique permissões.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChurch) return;
    
    setProcessing(true);
    setError('');

    try {
      // Secondary Firebase app to avoid signing out the current user
      const secondaryApp = getApps().find(app => app.name === 'Secondary') || initializeApp(firebaseConfig, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);
      
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, adminEmail, adminPassword);
      const uid = userCredential.user.uid;

      // 2. Create User Profile in Firestore
      await setDoc(doc(db, 'users', uid), {
        name: adminName,
        email: adminEmail,
        role: 'admin',
        tenant_id: selectedChurch.tenant_id,
        mustChangePassword: true,
        createdAt: new Date().toISOString()
      });

      // 3. Cleanup secondary auth
      await secondaryAuth.signOut();

      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      setShowAdminModal(false);
      setSuccessMessage(`Administrador criado para ${selectedChurch.name}`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao criar administrador.");
    } finally {
      setProcessing(false);
    }
  };

  if (profile?.role !== 'super_admin') {
    return <div className="p-8 text-center text-red-500 font-bold">Acesso restrito ao Super Administrador.</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight">Igrejas</h1>
          <p className="text-gray-500 font-mono text-sm tracking-widest mt-1 uppercase">Gestão Global de Tenants</p>
        </div>
        <button 
          onClick={() => setShowChurchModal(true)}
          className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-gray-200"
        >
          <Plus size={20} />
          Nova Instituição
        </button>
      </div>

      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100 flex items-center gap-3 font-bold"
          >
            <CheckCircle2 size={24} />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="animate-spin text-gray-400" size={48} />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {churches.map((church) => (
            <motion.div 
              key={church.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl text-gray-400">
                    <ChurchIcon size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{church.name}</h3>
                    <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mt-0.5">{church.tenant_id}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${church.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {church.status}
                </span>
              </div>
              
              <div className="pt-4 border-t border-gray-50">
                <button 
                  onClick={() => { setSelectedChurch(church); setShowAdminModal(true); }}
                  className="w-full py-3 bg-gray-50 text-gray-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-100 transition-all"
                >
                  <UserPlus size={18} />
                  Adicionar Administrador
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Criar Igreja */}
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
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-tight">Registrar Instituição</h2>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle size={18} /> {error}
                </div>
              )}

              <form onSubmit={handleCreateChurch} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome da Igreja</label>
                  <input
                    type="text"
                    value={newChurchName}
                    onChange={(e) => setNewChurchName(e.target.value)}
                    placeholder="Ex: Primeira Igreja Batista"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-medium"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowChurchModal(false)}
                    className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-50"
                  >
                    {processing ? 'Criando...' : 'Confirmar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Criar Admin */}
      <AnimatePresence>
        {showAdminModal && selectedChurch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdminModal(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Novo Administrador</h2>
                  <p className="text-sm font-medium text-blue-600">{selectedChurch.name}</p>
                </div>
                <button onClick={() => setShowAdminModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle size={18} /> {error}
                </div>
              )}

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Responsável</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-medium"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@igreja.com"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-medium"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha Temporária</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-medium"
                    required
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="animate-spin" /> : <Shield size={20} />}
                    {processing ? 'Registrando...' : 'Confirmar Acesso'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Churches;
