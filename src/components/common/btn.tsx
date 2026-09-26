import { Button } from "../ui/button";
export function Btn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Button
      onClick={onClick}
      className={`bg-white border rounded-md px-3 py-1.5 text-xs font-mono tracking-wide cursor-pointer transition-colors
        ${
          danger
            ? "border-red-300 text-red-500 hover:bg-red-50"
            : "border-gray-300 text-gray-700 hover:bg-gray-100"
        }`}
    >
      {children}
    </Button>
  );
}
