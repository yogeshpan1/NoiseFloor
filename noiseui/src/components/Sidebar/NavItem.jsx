import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NavItem({ to, label, icon: Icon, onClick, compact = false }) {
  return (
    <NavLink to={to} onClick={onClick} className="block" title={compact ? label : undefined}>
      {({ isActive }) => (
        <motion.div
          whileHover={compact ? { scale: 1.08 } : { x: 4 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className={`flex min-h-[44px] items-center gap-3 rounded-lg py-3 text-sm font-medium transition-colors duration-200 ${
            compact ? 'justify-center px-2' : 'px-4'
          } ${
            isActive
              ? 'bg-gold/10 text-gold-bright'
              : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
          }`}
        >
          {Icon && <Icon className="h-5 w-5 shrink-0" />}
          {!compact && <span>{label}</span>}
        </motion.div>
      )}
    </NavLink>
  );
}
