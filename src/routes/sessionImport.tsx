import { createFileRoute } from "@tanstack/react-router";
import { SessionImportPage } from "@/pages/sessionImport";

export const Route = createFileRoute("/sessionImport")({
  component: SessionImportPage,
});
