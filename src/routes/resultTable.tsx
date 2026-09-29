import { createFileRoute } from "@tanstack/react-router";
import { ResultTablePage } from "@/pages/resultTable";

export const Route = createFileRoute("/resultTable")({
  component: ResultTablePage,
});
