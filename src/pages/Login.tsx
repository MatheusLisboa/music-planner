import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Navigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Music, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/" />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        // Special case: if it's the requested SuperAdmin email and the user isn't found, try creating it
        if (email === 'matheus.fillipe.farias.lisboa@gmail.com' && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
           try {
             // Try to create the user with the specific password
             await createUserWithEmailAndPassword(auth, email, password);
             // If successful, onAuthStateChanged in AuthContext will handle the Firestore profile creation
           } catch (createErr) {
             // If creation fails (e.g. email already exists but password was wrong), re-throw original error
             throw err;
           }
        } else {
          throw err;
        }
      }
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('O login por E-mail/Senha não está ativado no Console do Firebase.');
      } else {
        setError('Erro ao entrar. Verifique suas credenciais.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Visual Side */}
      <div className="hidden lg:flex bg-gray-900 relative p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-green-500 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500 blur-[120px] rounded-full" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <Music className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-black tracking-tight uppercase">Music Planner</h1>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold text-white leading-tight"
          >
            Sincronize seu Louvor. Planeje com Excelência.
          </motion.h2>
          <p className="mt-6 text-gray-400 text-lg">
            A plataforma completa para gerenciar escalas, disponibilidade e repertórios da sua igreja.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-sm text-gray-500 uppercase tracking-widest font-mono">
            Elevando o nível do seu ministério © 2026
          </p>
        </div>
      </div>

      {/* Form Side - Registration removed as requested */}
      <div className="flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          <div className="lg:hidden flex justify-center mb-8">
            <Music className="text-gray-900" size={48} />
          </div>
          
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900">Bem-vindo</h2>
            <p className="text-gray-500 mt-2">
              Entre com suas credenciais para acessar o painel administrativo.
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600"
            >
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium leading-relaxed">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-medium"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 shadow-lg shadow-gray-200 mt-4"
            >
              {loading ? 'Entrando...' : (
                <>
                  Entrar
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400 leading-relaxed">
            Painel Privado. Apenas para usuários autorizados.<br/>
            Dúvidas? <a href="#" className="text-gray-900 font-bold hover:underline">Fale com o Administrador Regional</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
