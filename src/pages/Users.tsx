import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, setDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, getApp, getApps } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { db, auth as mainAuth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { User, UserRole, UserType, Church } from '../types';
import { Users as UsersIcon, Plus, Trash2, Edit3, X, Mail, Shield, User as UserIcon, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';

const UsersPage: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [churches, setChurches] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [type, setType] = useState<UserType>('vocal');
  const [instrument, setInstrument] = useState('');
  const [error, setError] = useState('');

  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (profile) {
      fetchUsers();
      if (isSuperAdmin) fetchChurches();
    }
  }, [profile]);

  const fetchChurches = async () => {
    try {
      const snap = await getDocs(collection(db, 'churches'));
      const map: Record<string, string> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        map[data.tenant_id] = data.name;
      });
      setChurches(map);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersCol = collection(db, 'users');
      let q;
      if (isSuperAdmin) {
        // Only show ADMINS for SuperAdmin
        q = query(usersCol, where('role', '==', 'admin'));
      } else {
        q = query(usersCol, where('tenant_id', '==', profile!.tenant_id));
      }
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setProcessing(true);
    setError('');

    try {
      if (editingUser) {
        const userData = {
          name,
          email,
          role,
          type,
          instrument,
          tenant_id: profile.tenant_id,
          mustChangePassword: editingUser.mustChangePassword
        };
        await updateDoc(doc(db, 'users', editingUser.id), userData);
      } else {
        // Create Auth User using secondary app trick
        const secondaryApp = getApps().find(app => app.name === 'Secondary') || initializeApp(firebaseConfig, 'Secondary');
        const secondaryAuth = getAuth(secondaryApp);
        
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, 'senhapadrao');
        const uid = userCredential.user.uid;

        const userData = {
          name,
          email,
          role,
          type,
          instrument,
          tenant_id: profile.tenant_id,
          mustChangePassword: true,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', uid), userData);
        await secondaryAuth.signOut();
      }
      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao gerenciar integrante.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza? Isso não removerá o usuário do Auth, apenas do perfil.')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('member');
    setType('vocal');
    setInstrument('');
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setType(user.type || 'vocal');
    setInstrument(user.instrument || '');
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{isSuperAdmin ? 'Administradores das Igrejas' : 'Integrantes'}</h1>
          <p className="text-gray-500">{isSuperAdmin ? 'Gestão de acessos administrativos de todas as instituições.' : 'Gerencie a equipe de louvor da sua igreja.'}</p>
        </div>
        {!isSuperAdmin && (
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-lg"
          >
            <Plus size={20} />
            Convidar/Criar
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Nome</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Função</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">{isSuperAdmin ? 'Igreja' : 'Tipo'}</th>
                <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <span className={clsx(
                      "px-3 py-1 rounded-full text-xs font-bold uppercase",
                      u.role === 'admin' ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {isSuperAdmin ? (
                      <div className="flex items-center gap-2 font-bold text-gray-900 uppercase tracking-tight">
                         <Building2 size={14} className="text-gray-400" />
                         {churches[u.tenant_id] || u.tenant_id}
                      </div>
                    ) : (
                      u.type === 'instrument' ? <span className="font-bold underline decoration-blue-500/30">{u.instrument}</span> : <span className="italic">Vocal</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                       <button onClick={() => openEdit(u)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                        <Edit3 size={18} />
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900">{editingUser ? 'Editar Integrante' : 'Novo Integrante'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-medium border border-red-100">
                  <AlertCircle size={20} className="shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-11 pr-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all" required />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all" required />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Role</label>
                    <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-medium appearance-none">
                      <option value="member">Integrante</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Tipo</label>
                    <select value={type} onChange={(e) => setType(e.target.value as UserType)} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-medium appearance-none">
                      <option value="vocal">Vocal</option>
                      <option value="instrument">Instrumental</option>
                    </select>
                  </div>
                  <div className={clsx("space-y-1 transition-all", type !== 'instrument' && "opacity-50 pointer-events-none")}>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Instrumento</label>
                    <input type="text" value={instrument} onChange={(e) => setInstrument(e.target.value)} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all" placeholder="Ex: Guitarra" />
                  </div>
                </div>

                {!editingUser && (
                  <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-2xl">
                    <p className="text-xs text-yellow-800 leading-relaxed font-medium">
                      O usuário será criado com a senha padrão: <span className="font-black">senhapadrao</span>. 
                      Ele será obrigado a trocá-la no primeiro acesso.
                    </p>
                  </div>
                )}

                <button type="submit" disabled={processing} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                  {processing ? <Loader2 className="animate-spin" /> : null}
                  {processing ? 'Processando...' : (editingUser ? 'Salvar Alterações' : 'Criar Integrante')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UsersPage;
