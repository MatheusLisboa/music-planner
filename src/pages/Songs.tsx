import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Song } from '../types';
import { Music, Plus, Trash2, Edit3, X, ExternalLink, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Songs: React.FC = () => {
  const { profile } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [key, setKey] = useState('');

  const MUSICAL_KEYS = [
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
    'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm'
  ];

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  useEffect(() => {
    if (profile) fetchSongs();
  }, [profile]);

  const fetchSongs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'songs'), where('tenant_id', '==', profile!.tenant_id), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      setSongs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Song)));
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
      name,
      youtubeLink,
      key,
      tenant_id: profile.tenant_id
    };

    try {
      if (editingSong) {
        await updateDoc(doc(db, 'songs', editingSong.id), data);
      } else {
        await addDoc(collection(db, 'songs'), data);
      }
      setShowModal(false);
      resetForm();
      fetchSongs();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingSong(null);
    setName('');
    setYoutubeLink('');
    setKey('');
  };

  const openEdit = (song: Song) => {
    setEditingSong(song);
    setName(song.name);
    setYoutubeLink(song.youtubeLink || '');
    setKey(song.key || '');
    setShowModal(true);
  };

  const filteredSongs = songs.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Repertório</h1>
          <p className="text-gray-500">Catálogo de músicas da igreja.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-lg"
          >
            <Plus size={20} />
            Adicionar Música
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Pesquisar música..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-medium"
        />
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSongs.map(song => (
            <motion.div
              layout
              key={song.id}
              className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Music size={24} />
                </div>
                <div className="flex gap-2">
                  {song.youtubeLink && (
                    <a href={song.youtubeLink} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <ExternalLink size={18} />
                    </a>
                  )}
                  {isAdmin && (
                    <>
                      <button onClick={() => openEdit(song)} className="p-2 text-gray-400 hover:text-gray-900 rounded-lg transition-colors">
                        <Edit3 size={18} />
                      </button>
                      <button onClick={async () => { if(window.confirm('Excluir música?')) { await deleteDoc(doc(db, 'songs', song.id)); fetchSongs(); } }} className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 truncate">{song.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-mono">ID: {song.id.slice(0,8)}</p>
                {song.key && (
                  <span className="px-2 py-0.5 bg-gray-900 text-white text-[10px] font-black rounded-md">{song.key}</span>
                )}
              </div>
            </motion.div>
          ))}
          
          {filteredSongs.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center opacity-30">
               <Music size={48} className="mx-auto mb-4" />
               <p className="font-medium">Nenhuma música encontrada.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900">{editingSong ? 'Editar Música' : 'Nova Música'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Nome da Música</label>
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-medium"
                    placeholder="Ex: Hosana"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Link YouTube (Opcional)</label>
                  <input 
                    type="url"
                    value={youtubeLink}
                    onChange={(e) => setYoutubeLink(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-medium"
                    placeholder="https://youtube.com/..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Tom (Opcional)</label>
                  <select 
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all font-medium appearance-none"
                  >
                    <option value="">Selecione o Tom</option>
                    {MUSICAL_KEYS.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-lg"
                >
                  {editingSong ? 'Salvar Alterações' : 'Adicionar Repertório'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Songs;
