import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Service, Schedule } from '../types';
import { Calendar, Music, Clock, ChevronRight, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { updatePassword } from 'firebase/auth';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [upcomingServices, setUpcomingServices] = useState<Service[]>([]);
  const [myNextScale, setMyNextScale] = useState<Schedule | null>(null);
  const [nextScaleService, setNextScaleService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Password change state
  const [showPassModal, setShowPassModal] = useState(profile?.mustChangePassword || false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      try {
        // Fetch upcoming services
        const servicesQuery = query(
          collection(db, 'services'),
          where('tenant_id', '==', profile.tenant_id),
          where('date', '>=', new Date().toISOString().split('T')[0]),
          orderBy('date', 'asc'),
          limit(5)
        );
        const servicesSnap = await getDocs(servicesQuery);
        const services = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Service));
        setUpcomingServices(services);

        // Fetch my next scale
        const schedulesQuery = query(
          collection(db, 'schedules'),
          where('tenant_id', '==', profile.tenant_id),
          where('user_ids', 'array-contains', profile.id),
          limit(1)
        );
        const schedulesSnap = await getDocs(schedulesQuery);
        if (!schedulesSnap.empty) {
          const schedule = { id: schedulesSnap.docs[0].id, ...schedulesSnap.docs[0].data() } as Schedule;
          setMyNextScale(schedule);
          
          // Fetch the specific service for this schedule
          const servSnap = await getDocs(query(collection(db, 'services'), where('id', '==', schedule.service_id)));
          if (!servSnap.empty) {
             setNextScaleService({ id: servSnap.docs[0].id, ...servSnap.docs[0].data() } as Service);
          }
        }
      } catch (error) {
        console.error("Dashboard data fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    
    if (newPassword.length < 6) {
      setPassError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('As senhas não coincidem.');
      return;
    }

    setPassLoading(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        await updateDoc(doc(db, 'users', profile!.id), {
          mustChangePassword: false
        });
        setShowPassModal(false);
      }
    } catch (err: any) {
      console.error(err);
      setPassError('Erro ao atualizar senha. Reentre no sistema e tente novamente.');
    } finally {
      setPassLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div></div>;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Olá, {profile?.name.split(' ')[0]}!</h1>
          <p className="text-gray-500 mt-1">Veja o que temos para os próximos dias.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full w-fit">
          <Clock size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {format(new Date(), "eeee, d 'de' MMMM", { locale: ptBR })}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Next Scale Card */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-gray-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-gray-200">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Music size={120} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
                  Sua Próxima Escala
                </div>
              </div>

              {myNextScale && nextScaleService ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-4xl font-bold">{nextScaleService.type}</h3>
                    <p className="text-gray-400 mt-1 text-lg">
                      {format(parseISO(nextScaleService.date), "d 'de' MMMM", { locale: ptBR })} às {nextScaleService.time}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/10 flex items-center gap-2">
                      <Music size={16} />
                      <span className="text-sm font-medium">{profile?.instrument || profile?.type}</span>
                    </div>
                    <div className={myNextScale.status === 'confirmed' ? "px-4 py-2 bg-green-500/20 text-green-400 rounded-xl flex items-center gap-2" : "px-4 py-2 bg-yellow-500/20 text-yellow-500 rounded-xl flex items-center gap-2"}>
                      {myNextScale.status === 'confirmed' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      <span className="text-sm font-bold uppercase tracking-wide">
                        {myNextScale.status === 'confirmed' ? 'Confirmada' : 'Aguardando'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400">
                  <p className="text-lg">Você não possui escalas pendentes.</p>
                  <button className="mt-4 text-white font-bold hover:underline">Ver todas as escalas</button>
                </div>
              )}
            </div>
          </section>

          {/* Activity/History List could go here */}
        </div>

        {/* Sidebar Mini-List */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Próximos Cultos
            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-500">{upcomingServices.length}</span>
          </h2>
          
          <div className="space-y-3">
            {upcomingServices.map(service => (
              <div 
                key={service.id}
                className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-gray-900 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex flex-col items-center justify-center text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                    <span className="text-xs font-bold leading-none">{format(parseISO(service.date), "MMM", { locale: ptBR }).toUpperCase()}</span>
                    <span className="text-lg font-black leading-none">{format(parseISO(service.date), "dd")}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{service.type}</h4>
                    <p className="text-xs text-gray-500">{service.time}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPassModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <ShieldCheck size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Segurança Necessária</h3>
                <p className="text-gray-500 mt-2 mb-8">Como este é seu primeiro acesso, você deve escolher uma nova senha segura.</p>
                
                {passError && (
                  <div className="w-full mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium flex items-center gap-2">
                    <AlertTriangle size={18} />
                    {passError}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="w-full space-y-4">
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Nova Senha</label>
                    <input 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Repetir Senha</label>
                    <input 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                      placeholder="Confirme sua nova senha"
                      required
                    />
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={passLoading}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                  >
                    {passLoading ? 'Salvando...' : 'Atualizar e Continuar'}
                  </button>
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
