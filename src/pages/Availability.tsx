import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Service, Availability as AvailabilityType } from '../types';
import { Calendar, CheckCircle2, XCircle, HelpCircle, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';
import { clsx } from 'clsx';

const Availability: React.FC = () => {
  const { profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [availabilities, setAvailabilities] = useState<Record<string, AvailabilityType>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch upcoming services
      const today = new Date().toISOString().split('T')[0];
      const servicesQuery = query(
        collection(db, 'services'),
        where('tenant_id', '==', profile!.tenant_id),
        where('date', '>=', today)
      );
      const servicesSnap = await getDocs(servicesQuery);
      const fetchedServices = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Service));
      fetchedServices.sort((a,b) => a.date.localeCompare(b.date));
      setServices(fetchedServices);

      // 2. Fetch my existing availabilities
      const availabilityQuery = query(
        collection(db, 'availability'),
        where('tenant_id', '==', profile!.tenant_id),
        where('user_id', '==', profile!.id)
      );
      const availabilitySnap = await getDocs(availabilityQuery);
      const availMap: Record<string, AvailabilityType> = {};
      availabilitySnap.docs.forEach(d => {
        const data = d.id ? { id: d.id, ...d.data() } as AvailabilityType : d.data() as AvailabilityType;
        availMap[data.service_id] = { id: d.id, ...data };
      });
      setAvailabilities(availMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (serviceId: string, status: AvailabilityType['status']) => {
    if (!profile) return;

    const existing = availabilities[serviceId];
    const data = {
      user_id: profile.id,
      service_id: serviceId,
      tenant_id: profile.tenant_id,
      status
    };

    try {
      if (existing) {
        await updateDoc(doc(db, 'availability', existing.id), { status });
        setAvailabilities(prev => ({
          ...prev,
          [serviceId]: { ...prev[serviceId], status }
        }));
      } else {
        const newDoc = await addDoc(collection(db, 'availability'), data);
        setAvailabilities(prev => ({
          ...prev,
          [serviceId]: { ...data, id: newDoc.id }
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sua Disponibilidade</h1>
        <p className="text-gray-500">Informe ao líder de louvor quando você pode servir.</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        {services.map(service => {
          const myAvail = availabilities[service.id];
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={service.id}
              className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex flex-col items-center justify-center text-gray-400">
                  <span className="text-[10px] font-black uppercase text-gray-400">{format(parseISO(service.date), 'MMM', { locale: ptBR })}</span>
                  <span className="text-2xl font-black leading-none text-gray-900">{format(parseISO(service.date), 'dd')}</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 leading-tight">{service.type}</h3>
                  <p className="text-gray-500 font-medium text-sm">
                    {format(parseISO(service.date), "eeee", { locale: ptBR })} às {service.time}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl">
                <button
                  onClick={() => handleToggle(service.id, 'available')}
                  className={clsx(
                    "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                    myAvail?.status === 'available' ? "bg-green-500 text-white shadow-lg shadow-green-100" : "text-gray-400 hover:text-gray-600 hover:bg-white"
                  )}
                >
                  <CheckCircle2 size={18} />
                  Sim
                </button>
                <button
                  onClick={() => handleToggle(service.id, 'maybe')}
                  className={clsx(
                    "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                    myAvail?.status === 'maybe' ? "bg-yellow-500 text-white shadow-lg shadow-yellow-100" : "text-gray-400 hover:text-gray-600 hover:bg-white"
                  )}
                >
                  <HelpCircle size={18} />
                  Talvez
                </button>
                <button
                  onClick={() => handleToggle(service.id, 'unavailable')}
                  className={clsx(
                    "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                    myAvail?.status === 'unavailable' ? "bg-red-500 text-white shadow-lg shadow-red-100" : "text-gray-400 hover:text-gray-600 hover:bg-white"
                  )}
                >
                  <XCircle size={18} />
                  Não
                </button>
              </div>
            </motion.div>
          );
        })}

        {services.length === 0 && (
          <div className="py-20 text-center opacity-50">
            <Calendar size={48} className="mx-auto mb-4" />
            <p className="font-medium">Nenhum culto futuro agendado.</p>
          </div>
        )}
      </div>
      
      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 text-blue-800">
        <div className="flex gap-4">
          <div className="p-2 bg-blue-100 rounded-xl h-fit"><CheckCircle2 size={24} /></div>
          <div>
            <h4 className="font-bold text-lg">Por que marcar?</h4>
            <p className="text-blue-700 mt-1">Ao marcar sua disponibilidade, você ajuda os líderes a montarem escalas sem conflitos de agenda.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Availability;
