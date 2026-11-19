type Props = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Sel({ children, ...props }: Props) {
  return (
    <select
      {...props}
      className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 font-mono outline-none focus:border-gray-500 transition-colors w-full"
    >
      {children}
    </select>
  );
}

// Width that fits the longest option label: Sel is text-sm monospace (0.6em = 8.4px/char) plus padding + arrow
export const selectWidth = (labels: string[]) =>
  Math.ceil(Math.max(0, ...labels.map((l) => l.length)) * 8.4 + 48);
