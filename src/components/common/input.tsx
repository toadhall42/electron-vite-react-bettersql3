import { Input } from "../ui/input";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export function Inp({ children, ...props }: Props) {
  return (
    <Input
      {...props}
      className={
        "bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 font-mono outline-none focus:border-gray-500 transition-colors w-full"
      }
    />
  );
}
