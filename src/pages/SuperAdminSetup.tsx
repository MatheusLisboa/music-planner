import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Music, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

const SuperAdminSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const superAdminEmail = 'matheus.fillipe.farias.lisboa@gmail.com';
  const superAdminPass = 'Mffl#1995';

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    
    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, superAdminEmail, superAdminPass);
      const uid = userCredential.user.uid;

      // 2. Create User Profile in Firestore
      await setDoc(doc(db, 'users', uid), {
        name: 'Matheus Lisboa',
        email: superAdminEmail,
        role: 'super_admin',
        tenant_id: 'global', // Super Admin doesn't belong to a single tenant
        mustChangePassword: false,
        createdAt: new Date().toISOString()
      });

      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Super Admin já existe ou o e-mail está em uso.');
      } else {
        setError('Erro ao configurar Super Admin: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-10 text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gray-900 rounded-2xl">
            <Music className="text-white" size={40} />
          </div>
        </div>

        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Super Admin Setup</h1>
        <p className="text-gray-500 mt-2 mb-8 lowercase font-mono text-sm tracking-wider">
          {superAdminEmail}
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-medium border border-red-100">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-left">{error}</p>
          </div>
        )}

        {success ? (
          <div className="p-8 bg-green-50 rounded-2xl border border-green-100 flex flex-col items-center gap-4">
            <div className="p-3 bg-green-500 rounded-full text-white shadow-lg shadow-green-200 animate-bounce">
                <ShieldCheck size={32} />
            </div>
            <p className="text-green-800 font-bold">Sucesso! Redirecionando para o login...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-2xl text-blue-800 text-sm border border-blue-100 text-left">
                <strong>Atenção:</strong> Este processo registrará permanentemente o e-mail solicitado como o Super Administrador global do Music Planner.
            </div>

            <button
              onClick={handleSetup}
              disabled={loading}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
              {loading ? 'Processando...' : 'Confirmar Privilégios'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SuperAdminSetup;
