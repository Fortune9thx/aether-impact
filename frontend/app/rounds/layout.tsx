import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rounds | Aether Impact",
  description: "Active and past GenLayer impact evaluation rounds.",
};

export default function RoundsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
