/** Soft sage-green organic shapes for page corners */
export function DecorativeBg() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10" aria-hidden>
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-sage-200/40 blur-3xl dark:bg-sage-800/20" />
      <div className="absolute top-1/4 -left-24 w-72 h-72 rounded-full bg-sage-300/25 blur-3xl dark:bg-sage-700/15" />
      <div className="absolute -bottom-40 left-8 w-[28rem] h-[28rem] rounded-full bg-sage-200/35 blur-3xl dark:bg-sage-800/15" />
      <svg
        className="absolute bottom-0 left-0 w-48 h-48 opacity-20 text-sage-400 dark:opacity-10 dark:text-sage-600"
        viewBox="0 0 200 200"
        fill="currentColor"
      >
        <circle cx="40" cy="160" r="60" />
        <circle cx="80" cy="140" r="40" />
        <circle cx="20" cy="120" r="30" />
      </svg>
    </div>
  );
}
