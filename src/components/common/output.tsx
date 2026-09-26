import { type Status } from "@/lib/types";

const dotColor: Record<Status, string> = {
  idle: "bg-gray-400",
  loading: "bg-amber-400",
  success: "bg-green-500",
  error: "bg-red-500",
};

interface RunOutputProps {
  result: any;
  status: Status;
  error: string | null;
}

export function RunOutput({ result, status, error }: RunOutputProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <span className="text-[11px] uppercase tracking-widest text-gray-500">
          Result
        </span>
        <span
          className={`w-2 h-2 rounded-full ${dotColor[status]}`}
          title={status}
        />
      </div>
      <pre className="p-3 text-xs text-gray-500 whitespace-pre-wrap break-all min-h-20">
        {status === "error"
          ? error
          : result != null
            ? JSON.stringify(result, null, 2)
            : "—"}
      </pre>
    </div>
  );
}
