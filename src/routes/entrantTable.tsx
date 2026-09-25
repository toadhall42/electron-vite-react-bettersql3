import { createFileRoute } from "@tanstack/react-router";
import { EntrantTablePage } from "@/pages/entrantTable";

export const Route = createFileRoute("/entrantTable")({
  component: EntrantTablePage,
});
