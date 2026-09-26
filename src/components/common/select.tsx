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
