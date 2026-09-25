import { createFileRoute } from "@tanstack/react-router";
import { EntrantInputPage } from "@/pages/entrantInput";

export const Route = createFileRoute("/entrantInput")({
  component: EntrantInputPage,
});
