export function PhantomLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="phantom-logo" aria-label="幻局斗地主辅助智能体">
      <span className="phantom-mark" aria-hidden="true">
        <i />
        <i />
        <b />
      </span>
      <span className="phantom-wordmark">
        <strong>幻局</strong>
        {!compact && <small>斗地主 · 可解释辅助智能体</small>}
      </span>
    </div>
  );
}
