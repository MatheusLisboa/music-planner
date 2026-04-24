import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit, orderBy, updateDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Service, Schedule, User as UserProfile, Attendance, Availability as AvailabilityType, Church } from '../types';
import { 
  Calendar, Music, Clock, ChevronRight, CheckCircle2, XCircle, AlertTriangle, 
  ShieldCheck, Users, BarChart3, UserCheck, Search, Check, Filter, Loader2, 
  Building2, Hash, Power 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { updatePassword } from 'firebase/auth';

const Dashboard: React.FC = () => {
  const { profile, churches } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Member/Admin states
  const [upcomingServices, setUpcomingServices] = useState<Service[]>([]);
  const [myNextScale, setMyNextScale] = useState<Schedule | null>(null);
  const [nextScaleService, setNextScaleService] = useState<Service | null>(null);
  const [tenantUsers, setTenantUsers] = useState<UserProfile[]>([]);
  const [tenantServices, setTenantServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [attendances, setAttendances] = useState<Record<string, Attendance>>({});
  const [availabilities, setAvailabilities] = useState<Record<string, AvailabilityType>>({});
  const [schedules, setSchedules] = useState<Record<string, Schedule>>({});
  const [stats, setStats] = useState({ members: 0, songs: 0, services: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  // SuperAdmin states
  const [globalStats, setGlobalStats] = useState({ users: 0, activeChurches: 0, inactiveChurches: 0 });
  const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
  const [churchList, setChurchList] = useState<Church[]>([]);
  const [userCountsPerChurch, setUserCountsPerChurch] = useState<Record<string, number>>({});

  // Password change state
  const [showPassModal, setShowPassModal] = useState(profile?.mustChangePassword || false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        if (isSuperAdmin) {
          // Super Admin Global Data
          const usersSnap = await getDocs(collection(db, 'users'));
          const churchesSnap = await getDocs(collection(db, 'churches'));
          
          const churches = churchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Church));
          const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
          
          const counts: Record<string, number> = {};
          users.forEach(u => {
            counts[u.tenant_id] = (counts[u.tenant_id] || 0) + 1;
          });
          setUserCountsPerChurch(counts);

          setGlobalStats({
            users: users.length,
            activeChurches: churches.filter(c => c.status === 'active').length,
            inactiveChurches: churches.filter(c => c.status === 'inactive').length
          });
          setRecentUsers(users.slice(0, 10));
          setChurchList(churches);
        } else if (isAdmin) {
          // Admin Data
          const tenantId = profile.tenant_id;
          const usersSnap = await getDocs(query(collection(db, 'users'), where('tenant_id', '==', tenantId)));
          const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
          setTenantUsers(users);

          const songsSnap = await getDocs(query(collection(db, 'songs'), where('tenant_id', '==', tenantId)));
          
          const servicesQuery = query(
            collection(db, 'services'),
            where('tenant_id', '==', tenantId),
            where('date', '>=', today),
            orderBy('date', 'asc')
          );
          const servicesSnap = await getDocs(servicesQuery);
          const services = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Service));
          setTenantServices(services);
          if (services.length > 0) setSelectedServiceId(services[0].id);

          setStats({
            members: users.length,
            songs: songsSnap.size,
            services: services.length
          });
        } else {
          // Member Data
          const tenantId = profile.tenant_id;
          const servicesQuery = query(
            collection(db, 'services'),
            where('tenant_id', '==', tenantId),
            where('date', '>=', today),
            orderBy('date', 'asc'),
            limit(5)
          );
          const servicesSnap = await getDocs(servicesQuery);
          setUpcomingServices(servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));

          const schedulesQuery = query(
            collection(db, 'schedules'),
            where('tenant_id', '==', tenantId),
            where('user_ids', 'array-contains', profile.id),
            limit(1)
          );
          const schedulesSnap = await getDocs(schedulesQuery);
          if (!schedulesSnap.empty) {
            const schedule = { id: schedulesSnap.docs[0].id, ...schedulesSnap.docs[0].data() } as Schedule;
            setMyNextScale(schedule);
            const servSnap = await getDocs(query(collection(db, 'services'), where('id', '==', schedule.service_id)));
            if (!servSnap.empty) {
               setNextScaleService({ id: servSnap.docs[0].id, ...servSnap.docs[0].data() } as Service);
            }
          }
        }
      } catch (error) {
        console.error("Dashboard data fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile, isAdmin, isSuperAdmin]);

  useEffect(() => {
    if (isAdmin && selectedServiceId) {
      fetchServiceContext();
    }
  }, [selectedServiceId, isAdmin]);

  const fetchServiceContext = async () => {
    if (!selectedServiceId || !profile) return;
    try {
      const tenantId = profile.tenant_id;
      // Fetch Attendances
      const attSnap = await getDocs(query(
        collection(db, 'attendance'), 
        where('service_id', '==', selectedServiceId),
        where('tenant_id', '==', tenantId)
      ));
      const attMap: Record<string, Attendance> = {};
      attSnap.docs.forEach(d => { attMap[d.data().user_id] = { id: d.id, ...d.data() } as Attendance });
      setAttendances(attMap);

      // Fetch Availabilities
      const avSnap = await getDocs(query(
        collection(db, 'availability'),
        where('service_id', '==', selectedServiceId),
        where('tenant_id', '==', tenantId)
      ));
      const avMap: Record<string, AvailabilityType> = {};
      avSnap.docs.forEach(d => { avMap[d.data().user_id] = { id: d.id, ...d.data() } as AvailabilityType });
      setAvailabilities(avMap);

      // Fetch Schedules
      const scSnap = await getDocs(query(
        collection(db, 'schedules'),
        where('service_id', '==', selectedServiceId),
        where('tenant_id', '==', tenantId)
      ));
      const scMap: Record<string, Schedule> = {};
      if (!scSnap.empty) {
        scMap[selectedServiceId] = { id: scSnap.docs[0].id, ...scSnap.docs[0].data() } as Schedule;
      }
      setSchedules(scMap);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePresenceToggle = async (userId: string) => {
    if (!selectedServiceId || !profile) return;
    
    const existing = attendances[userId];
    try {
      if (existing) {
        await deleteDoc(doc(db, 'attendance', existing.id));
        setAttendances(prev => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      } else {
        const id = `${selectedServiceId}_${userId}`;
        const data = {
          user_id: userId,
          service_id: selectedServiceId,
          tenant_id: profile.tenant_id,
          timestamp: new Date().toISOString()
        };
        await setDoc(doc(db, 'attendance', id), data);
        setAttendances(prev => ({ ...prev, [userId]: { id, ...data } }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (newPassword.length < 6) { setPassError('Mínimo 6 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setPassError('As senhas não coincidem.'); return; }
    setPassLoading(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        await updateDoc(doc(db, 'users', profile!.id), { mustChangePassword: false });
        setShowPassModal(false);
      }
    } catch (err: any) {
      setPassError('Erro ao atualizar. Tente relogar.');
    } finally {
      setPassLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin text-gray-400" size={40} /></div>;

  if (isSuperAdmin) {
    return (
      <div className="space-y-10 pb-20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight">Dashboard Global</h1>
            <p className="text-gray-500 font-medium">Controle Total do Ecossistema</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
             <div className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Usuários</p>
                <p className="text-3xl font-black text-gray-900">{globalStats.users}</p>
             </div>
             <div className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Igrejas Ativas</p>
                <p className="text-3xl font-black text-green-600">{globalStats.activeChurches}</p>
             </div>
             <div className="hidden md:block bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Instituições</p>
                <p className="text-3xl font-black text-gray-400">{globalStats.activeChurches + globalStats.inactiveChurches}</p>
             </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden">
               <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                  <h2 className="text-xl font-bold text-gray-900">Usuários Recentes</h2>
                  <Users size={20} className="text-gray-300" />
               </div>
               <div className="divide-y divide-gray-50">
                  {recentUsers.map(user => (
                    <div key={user.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500">
                             {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-400">{user.email} • {user.role}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-gray-400">Cidade / Tenant</p>
                          <p className="text-xs font-medium text-gray-600">{user.tenant_id}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-gray-900 p-8 rounded-[2.5rem] text-white shadow-xl">
               <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                 <Building2 size={16} /> Volume de Usuários
               </h2>
               <div className="space-y-6">
                  {churchList.slice(0, 8).map(church => (
                    <div key={church.id} className="flex items-center justify-between group">
                       <div className="flex-1">
                          <p className="font-bold text-sm uppercase truncate">{church.name}</p>
                          <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${Math.min((userCountsPerChurch[church.tenant_id] || 0) * 5, 100)}%` }}
                               className="h-full bg-blue-500"
                             />
                          </div>
                       </div>
                       <div className="ml-4 text-right">
                          <p className="text-lg font-black">{userCountsPerChurch[church.tenant_id] || 0}</p>
                          <p className="text-[8px] font-black uppercase text-gray-500">Membros</p>
                       </div>
                    </div>
                  ))}
               </div>
            </section>

            <section className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm">
               <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                 <Power size={16} /> Status Operacional
               </h2>
               <div className="space-y-4">
                  {churchList.slice(0, 5).map(church => (
                    <div key={church.id} className="flex items-center justify-between">
                       <span className="text-sm font-medium text-gray-700">{church.name}</span>
                       <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                         church.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                       }`}>
                         {church.status}
                       </div>
                    </div>
                  ))}
               </div>
            </section>

            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-center space-y-4">
               <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                  <ShieldCheck size={32} />
               </div>
               <h3 className="font-bold text-gray-900">Privilégio Super Admin</h3>
               <p className="text-xs text-gray-500 leading-relaxed">Você tem acesso total aos dados de todas as instituições e usuários para suporte e manutenção.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="space-y-8 pb-20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight">Painel Administrativo</h1>
            <p className="text-gray-500 font-medium">{churches[profile?.tenant_id || ''] || 'Gestão Ministerial Completa'}</p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[120px] bg-white border border-gray-100 p-4 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3 mb-1">
                <Users size={16} className="text-blue-500" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Membros</span>
              </div>
              <p className="text-2xl font-black text-gray-900">{stats.members}</p>
            </div>
            <div className="flex-1 min-w-[120px] bg-white border border-gray-100 p-4 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3 mb-1">
                <Music size={16} className="text-purple-500" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Repertório</span>
              </div>
              <p className="text-2xl font-black text-gray-900">{stats.songs}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <section className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden">
              <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-900 text-white rounded-2xl">
                    <UserCheck size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Registro de Presença</h2>
                    <p className="text-sm text-gray-500">Controle de comparecimento em tempo real.</p>
                  </div>
                </div>

                <select 
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="px-4 py-3 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none"
                >
                  {tenantServices.map(s => (
                    <option key={s.id} value={s.id}>
                      {format(parseISO(s.date), 'dd/MM')} - {s.type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-8 space-y-6">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pesquisar por nome ou instrumento..."
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl outline-none font-medium text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {tenantUsers.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())).map(user => {
                    const isPresent = !!attendances[user.id];
                    const isScaled = schedules[selectedServiceId]?.user_ids.includes(user.id);
                    const availability = availabilities[user.id]?.status;

                    return (
                      <motion.div 
                        layout
                        key={user.id}
                        onClick={() => handlePresenceToggle(user.id)}
                        className={`group p-5 rounded-3xl border transition-all cursor-pointer flex items-center justify-between ${
                          isPresent 
                            ? 'bg-gray-900 border-gray-900 text-white shadow-xl scale-[1.02]' 
                            : 'bg-white border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${
                            isPresent ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm leading-tight">{user.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <span className={`text-[9px] font-black uppercase tracking-widest opacity-60`}>
                                {user.instrument || user.type}
                              </span>
                              {isScaled && (
                                <div className={`w-1.5 h-1.5 rounded-full ${isPresent ? 'bg-blue-400' : 'bg-blue-600'}`} />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                           {availability && !isPresent && (
                            <div className={`p-1.5 rounded-xl ${
                              availability === 'available' ? 'bg-green-50 text-green-600' :
                              availability === 'maybe' ? 'bg-yellow-50 text-yellow-600' :
                              'bg-red-50 text-red-600'
                            }`}>
                               {availability === 'available' ? <CheckCircle2 size={16} /> : 
                                availability === 'maybe' ? <Clock size={16} /> : <XCircle size={16} />}
                            </div>
                          )}
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isPresent ? 'bg-white border-white text-gray-900' : 'border-gray-100'
                          }`}>
                            {isPresent && <Check size={14} strokeWidth={4} />}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-gray-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5">
                <BarChart3 size={150} />
               </div>
               <div className="relative z-10">
                <div className="flex items-center gap-2 mb-8 font-black text-[10px] uppercase tracking-widest text-gray-500">
                  <BarChart3 size={16} />
                  Resumo do Evento
                </div>
                
                {selectedServiceId && (
                  <div className="space-y-8">
                    <div className="flex items-end gap-3 font-black">
                      <span className="text-6xl">{Object.keys(attendances).length}</span>
                      <div className="mb-2">
                        <p className="text-blue-400 text-sm leading-none">PRESENTES</p>
                        <p className="text-gray-500 text-xs">de {tenantUsers.length} totais</p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-sm font-medium">Escalados presentes:</span>
                        <span className="font-bold text-white">
                          {schedules[selectedServiceId]?.user_ids.filter(uid => attendances[uid]).length || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-sm font-medium">Apoio extra:</span>
                        <span className="font-bold text-green-400">
                           {Object.keys(attendances).filter(uid => !schedules[selectedServiceId]?.user_ids.includes(uid)).length}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
               </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight">Olá, {profile?.name.split(' ')[0]}!</h1>
          <p className="text-gray-500 font-medium mt-1 uppercase tracking-widest text-xs">
            {churches[profile?.tenant_id || ''] || 'Sincronize seu louvor'}
          </p>
        </div>
        <div className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <Clock size={16} className="text-gray-400" />
          <span className="text-sm font-bold text-gray-700">
            {format(new Date(), "eeee, d 'de' MMMM", { locale: ptBR })}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <motion.section 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-900 rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-gray-200"
          >
            <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
              <Music size={160} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-8">
                <div className="px-5 py-2 bg-white/10 backdrop-blur-xl rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                  Sua Próxima Escala
                </div>
              </div>

              {myNextScale && nextScaleService ? (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-5xl font-black leading-tight">{nextScaleService.type}</h3>
                    <p className="text-gray-400 mt-2 text-xl font-medium">
                      {format(parseISO(nextScaleService.date), "dd 'de' MMMM", { locale: ptBR })} • {nextScaleService.time}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-4">
                    <div className="px-6 py-3 bg-white/10 rounded-2xl border border-white/10 flex items-center gap-3">
                      <Music size={20} className="text-blue-400" />
                      <span className="font-bold">{profile?.instrument || profile?.type}</span>
                    </div>
                    <div className={myNextScale.status === 'confirmed' ? "px-6 py-3 bg-green-500/20 text-green-400 rounded-2xl flex items-center gap-3 border border-green-500/10" : "px-6 py-3 bg-yellow-500/20 text-yellow-500 rounded-2xl flex items-center gap-3 border border-yellow-500/10"}>
                      {myNextScale.status === 'confirmed' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                      <span className="font-black uppercase tracking-widest text-sm">
                        {myNextScale.status === 'confirmed' ? 'Confirmada' : 'Aguardando'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-gray-500 space-y-4">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle size={40} />
                  </div>
                  <p className="text-xl font-medium">Não há escalas para você no momento.</p>
                </div>
              )}
            </div>
          </motion.section>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-black text-gray-900 flex items-center justify-between uppercase tracking-tight">
            Cultos Próximos
            <span className="text-[10px] font-mono bg-gray-100 px-3 py-1 rounded-full text-gray-500">{upcomingServices.length}</span>
          </h2>
          
          <div className="space-y-4">
            {upcomingServices.map(service => (
              <motion.div 
                whileHover={{ x: 5 }}
                key={service.id}
                className="group flex items-center justify-between p-5 bg-white border border-gray-100 rounded-3xl hover:border-gray-900 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex flex-col items-center justify-center text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-all">
                    <span className="text-[10px] font-black uppercase leading-none opacity-60 mb-0.5">{format(parseISO(service.date), "MMM", { locale: ptBR })}</span>
                    <span className="text-xl font-black leading-none">{format(parseISO(service.date), "dd")}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{service.type}</h4>
                    <p className="text-xs text-gray-500 font-medium">{service.time}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-900 transition-all" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showPassModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mb-8"><ShieldCheck size={40} /></div>
                <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Novo Acesso</h3>
                <p className="text-gray-500 mt-2 mb-10 font-medium">Por segurança, altere sua senha temporária agora.</p>
                {passError && <div className="w-full mb-8 p-4 bg-red-50 border border-red-100 rounded-3xl text-red-600 text-sm font-bold flex items-center gap-3"><AlertTriangle size={20} />{passError}</div>}
                <form onSubmit={handleChangePassword} className="w-full space-y-6">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nova Senha</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" placeholder="••••••••" required />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirme</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" placeholder="••••••••" required />
                  </div>
                  <button type="submit" disabled={passLoading} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl">{passLoading ? 'Salvando...' : 'Confirmar e Entrar'}</button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
