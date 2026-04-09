import { motion } from 'framer-motion';
import type { PropsWithChildren } from 'react';

export function PageTransition({ children }: PropsWithChildren) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 min-h-0 flex flex-col"
    >
      {children}
    </motion.div>
  );
}
