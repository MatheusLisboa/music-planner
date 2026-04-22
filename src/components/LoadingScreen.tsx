import React from 'react';
import { motion } from 'motion/react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-[100]">
      <div className="flex flex-col items-center">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 360],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full"
        />
        <p className="mt-4 text-sm font-medium text-gray-500 uppercase tracking-widest animate-pulse">Carregando...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
