import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Service } from '../types';
import { Calendar, Plus, Trash2, Edit3, X, Clock, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

const Services: React.FC = () => {
  const { profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  // Form state
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('');

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  useEffect(() => {
    if (profile) fetchServices();
  }, [profile]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'services'),
        where('tenant_id', '==', profile!.tenant_id),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const data = {
      date,
      time,
      type,
      tenant_id: profile.tenant_id
    };

    try {
      if (editingService) {
        await updateDoc(doc(db, 'services', editingService.id), data);
      } else {
        await addDoc(collection(db, 'services'), data);
      }
      setShowModal(false);
      resetForm();
      fetchServices();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este culto?')) return;
    try {
      await deleteDoc(doc(db, 'services', id));
      fetchServices();
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setDate(service.date);
    setTime(service.time);
    setType(service.type);
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingService(null);
    setDate('');
    setTime('');
    setType('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cultos</h1>
          <p className="text-gray-500">Gerenciamento de datas e horários.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200"
          >
            <Plus size={20} />
            Novo Culto
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div></div>
      ) : services.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-[2.5rem] py-20 flex flex-col items-center justify-center text-gray-400">
          <Calendar size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">Nenhum culto cadastrado.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(service => (
            <motion.div
              layout
              key={service.id}
              className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex flex-col items-center justify-center text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                  <span className="text-[10px] font-bold uppercase">{format(parseISO(service.date), 'MMM', { locale: ptBR })}</span>
                  <span className="text-xl font-black leading-none">{format(parseISO(service.date), 'dd')}</span>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(service)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => handleDelete(service.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-gray-900">{service.type}</h3>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock size={16} />
                  <span>{service.time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar size={16} />
                  <span>{format(parseISO(service.date), "eeee", { locale: ptBR })}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900">{editingService ? 'Editar Culto' : 'Novo Culto'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Tipo de Culto</label>
                  <input 
                    type="text"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all font-medium"
                    placeholder="Ex: Culto de Celebração"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Data</label>
                    <input 
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all font-medium"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Hora</label>
                    <input 
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-lg shadow-gray-100"
                >
                  {editingService ? 'Salvar Alterações' : 'Criar Culto'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Services;
