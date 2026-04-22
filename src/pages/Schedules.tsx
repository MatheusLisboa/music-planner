import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Service, Schedule, User, Song, Availability } from '../types';
import { Music, Plus, Trash2, Edit3, X, CheckCircle2, AlertTriangle, User as UserIcon, ListMusic, ChevronRight, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';

const Schedules: React.FC = () => {
  const { profile } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  // Form state
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [status, setStatus] = useState<Schedule['status']>('pending');

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tenantId = profile!.tenant_id;
      
      // Fetch all needed data
      const schedulesSnap = await getDocs(query(collection(db, 'schedules'), where('tenant_id', '==', tenantId)));
      const servicesSnap = await getDocs(query(collection(db, 'services'), where('tenant_id', '==', tenantId), orderBy('date', 'desc')));
      const usersSnap = await getDocs(query(collection(db, 'users'), where('tenant_id', '==', tenantId)));
      const songsSnap = await getDocs(query(collection(db, 'songs'), where('tenant_id', '==', tenantId)));
      const availSnap = await getDocs(query(collection(db, 'availability'), where('tenant_id', '==', tenantId)));

      setSchedules(schedulesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Schedule)));
      setServices(servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
      setSongs(songsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Song)));
      setAvailabilities(availSnap.docs.map(d => ({ id: d.id, ...d.data() } as Availability)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getServiceById = (id: string) => services.find(s => s.id === id);
  const getUserById = (id: string) => users.find(u => u.id === id);
  const getSongById = (id: string) => songs.find(s => s.id === id);

  const getAvailabilityStatus = (userId: string, serviceId: string) => {
    const avail = availabilities.find(a => a.user_id === userId && a.service_id === serviceId);
    return avail?.status || 'unknown';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const data = {
      service_id: selectedServiceId,
      user_ids: selectedUserIds,
      song_ids: selectedSongIds,
      status,
      tenant_id: profile.tenant_id
    };

    try {
      if (editingSchedule) {
        await updateDoc(doc(db, 'schedules', editingSchedule.id), data);
      } else {
        await addDoc(collection(db, 'schedules'), data);
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingSchedule(null);
    setSelectedServiceId('');
    setSelectedUserIds([]);
    setSelectedSongIds([]);
    setStatus('pending');
  };

  const openEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setSelectedServiceId(schedule.service_id);
    setSelectedUserIds(schedule.user_ids);
    setSelectedSongIds(schedule.song_ids);
    setStatus(schedule.status);
    setShowModal(true);
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleSong = (songId: string) => {
    setSelectedSongIds(prev => 
      prev.includes(songId) ? prev.filter(id => id !== songId) : [...prev, songId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Escalas</h1>
          <p className="text-gray-500">Planejamento semanal do ministério.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-lg"
          >
            <Plus size={20} />
            Montar Escala
          </button>
        )}
      </div>

      <div className="space-y-4">
        {schedules.map(schedule => {
          const service = getServiceById(schedule.service_id);
          if (!service) return null;
          return (
            <motion.div
              layout
              key={schedule.id}
              className="bg-white border border-gray-100 rounded-[2.5rem] p-6 lg:p-8 shadow-sm flex flex-col lg:flex-row gap-8 hover:shadow-xl transition-all"
            >
              <div className="lg:w-1/4 border-b lg:border-b-0 lg:border-r border-gray-100 pb-6 lg:pb-0 lg:pr-8">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar size={24} className="text-gray-400" />
                  <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Serviço</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 leading-tight">{service.type}</h3>
                <p className="text-gray-500 font-medium mt-1">
                  {format(parseISO(service.date), "dd/MM", { locale: ptBR })} às {service.time}
                </p>
                <div className={clsx(
                  "mt-6 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase",
                  schedule.status === 'confirmed' ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"
                )}>
                  {schedule.status === 'confirmed' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {schedule.status}
                </div>
              </div>

              <div className="lg:flex-1 space-y-6">
                <div>
                   <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-gray-400">
                      <UserIcon size={18} />
                      <span className="text-xs font-bold uppercase tracking-widest">Equipe Escalada</span>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                         <button onClick={() => openEdit(schedule)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><Edit3 size={18} /></button>
                         <button onClick={async () => { if(window.confirm('Excluir escala?')) { await deleteDoc(doc(db, 'schedules', schedule.id)); fetchData(); } }} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {schedule.user_ids.map(uid => {
                      const u = getUserById(uid);
                      if (!u) return null;
                      const avail = getAvailabilityStatus(uid, schedule.service_id);
                      return (
                        <div key={uid} className="group relative">
                          <div className={clsx(
                            "px-4 py-2 rounded-xl border flex items-center gap-2 transition-all",
                            avail === 'available' ? "bg-green-50 border-green-100 text-green-700" : 
                            avail === 'unavailable' ? "bg-red-50 border-red-100 text-red-700" : 
                            avail === 'maybe' ? "bg-yellow-50 border-yellow-100 text-yellow-700" :
                            "bg-gray-50 border-gray-100 text-gray-500"
                          )}>
                            <span className="text-sm font-bold">{u.name.split(' ')[0]}</span>
                            <span className="text-[10px] opacity-70 underline decoration-current/30">{u.instrument || 'Vocal'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                   <div className="flex items-center gap-2 text-gray-400 mb-4">
                    <ListMusic size={18} />
                    <span className="text-xs font-bold uppercase tracking-widest">Repertório</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {schedule.song_ids.map(sid => {
                      const song = getSongById(sid);
                      if (!song) return null;
                      return (
                        <a 
                          key={sid} 
                          href={song.youtubeLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700">{song.name}</span>
                            {song.key && (
                              <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-[9px] font-black rounded uppercase">{song.key}</span>
                            )}
                          </div>
                          <ChevronRight size={14} className="text-gray-400" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <h3 className="text-2xl font-bold text-gray-900">{editingSchedule ? 'Editar Escala' : 'Montar Nova Escala'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              <div className="flex-1 p-8 overflow-y-auto bg-gray-50/30">
                <form onSubmit={handleSubmit} className="space-y-10">
                  {/* Step 1: Service */}
                  <section>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 block">1. Escolha o Culto</label>
                    <select 
                      value={selectedServiceId} 
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm text-lg font-bold focus:outline-none focus:ring-2 focus:ring-gray-900/10 active:scale-[0.99] transition-all"
                      required
                    >
                      <option value="">Selecione um culto...</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.type} - {format(parseISO(s.date), 'dd/MM')} às {s.time}
                        </option>
                      ))}
                    </select>
                  </section>

                  {/* Step 2: Users */}
                  <section className={clsx(!selectedServiceId && "opacity-30 pointer-events-none")}>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 block">2. Selecione a Equipe</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {users.map(u => {
                        const avail = getAvailabilityStatus(u.id, selectedServiceId);
                        const isSelected = selectedUserIds.includes(u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={() => toggleUser(u.id)}
                            className={clsx(
                              "relative p-4 rounded-2xl border-2 transition-all cursor-pointer select-none overflow-hidden",
                              isSelected ? "bg-gray-900 border-gray-900 text-white shadow-xl scale-105 z-10" : "bg-white border-gray-100 border-dashed hover:border-gray-300"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                               <div className={clsx(
                                "w-3 h-3 rounded-full",
                                avail === 'available' ? "bg-green-500" : avail === 'unavailable' ? "bg-red-500" : avail === 'maybe' ? "bg-yellow-500" : "bg-gray-300"
                              )} />
                              {isSelected && <CheckCircle2 size={16} />}
                            </div>
                            <p className="font-bold truncate">{u.name}</p>
                            <p className={clsx("text-[10px] font-bold uppercase", isSelected ? "text-gray-400" : "text-gray-500")}>
                              {u.instrument || u.type}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Step 3: Songs */}
                  <section>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 block">3. Escolha as Músicas</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {songs.map(song => {
                        const isSelected = selectedSongIds.includes(song.id);
                        return (
                          <div
                            key={song.id}
                            onClick={() => toggleSong(song.id)}
                            className={clsx(
                              "p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between",
                              isSelected ? "bg-blue-50 border-blue-500 text-blue-900" : "bg-white border-gray-100"
                            )}
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-sm">{song.name}</span>
                              {song.key && <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{song.key}</span>}
                            </div>
                            {isSelected && <CheckCircle2 size={18} />}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <div className="flex items-center gap-6 pt-6 border-t border-gray-100">
                    <div className="flex-1">
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Status da Escala</label>
                       <div className="flex gap-2">
                        <button type="button" onClick={() => setStatus('pending')} className={clsx("flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm", status === 'pending' ? "bg-yellow-50 border-yellow-500 text-yellow-600" : "bg-white border-gray-100")}>Pendente</button>
                        <button type="button" onClick={() => setStatus('confirmed')} className={clsx("flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm", status === 'confirmed' ? "bg-green-50 border-green-500 text-green-600" : "bg-white border-gray-100")}>Confirmada</button>
                       </div>
                    </div>
                    <button type="submit" className="flex-[2] py-6 bg-gray-900 text-white rounded-[2rem] font-black text-xl hover:bg-black transition-all shadow-2xl shadow-gray-200">
                      {editingSchedule ? 'Salvar Escala' : 'Publicar Escala'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Schedules;
