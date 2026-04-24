import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User as AppUser } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: AppUser | null;
  churches: Record<string, string>;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [churches, setChurches] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Forçar logout uma vez para atender ao pedido do usuário de "recarregar para tela de login sem sessão"
    auth.signOut();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Objetivo: Todo usuário autenticado deve ser buscado em users/{uid}
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const profileData = { id: userSnap.id, ...(userSnap.data() as object) } as AppUser;
            setProfile(profileData);

            // Buscar nome da igreja do usuário
            if (profileData.tenant_id) {
              const churchSnap = await getDoc(doc(db, 'churches', profileData.tenant_id));
              if (churchSnap.exists()) {
                setChurches({ [profileData.tenant_id]: churchSnap.data().name });
              }
            }
          } else if (firebaseUser.email === 'matheus.fillipe.farias.lisboa@gmail.com') {
            // Auto-provision SuperAdmin profile if it doesn't exist yet
            const superAdminProfile: AppUser = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              name: 'Matheus Lisboa',
              email: firebaseUser.email,
              role: 'super_admin',
              tenant_id: 'global',
              mustChangePassword: false,
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), superAdminProfile);
            setProfile(superAdminProfile);
            console.log("SuperAdmin profile auto-provisioned.");
          } else {
            console.warn("User profile not found in Firestore at users/" + firebaseUser.uid);
            setProfile(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
        setChurches({});
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, churches, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
