export default function RangeSlider({
  label,
  value,
  onChange,
  min = -2,
  max = 2,
  step = 0.1,
  formatValue = (n) => n.toFixed(2),
  disabled = false,
  disabledReason = '',
}) {
  return (
    <div className={disabled ? 'opacity-40' : ''} title={disabled ? disabledReason : undefined}>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium text-text-secondary">{label}</span>
        <span className="font-semibold text-gold-bright">
          {value >= 0 ? '+' : ''}
          {formatValue(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#d4af37] disabled:cursor-not-allowed"
      />
    </div>
  );
}
