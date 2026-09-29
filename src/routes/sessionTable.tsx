import { createFileRoute } from "@tanstack/react-router";
import { SessionTablePage } from "@/pages/sessionTable";

export const Route = createFileRoute("/sessionTable")({
  component: SessionTablePage,
});
