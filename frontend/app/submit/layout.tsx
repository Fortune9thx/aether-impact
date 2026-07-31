import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit a Project | Aether Impact",
  description: "Submit a project for GenLayer Intelligent Contract evaluation.",
};

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return children;
}
