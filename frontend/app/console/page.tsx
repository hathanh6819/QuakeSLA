import type { Metadata } from "next";
import { QuakeConsole } from "@/components/QuakeConsole";

export const metadata: Metadata = {
  title: "Live Console | QuakeSLA",
  description: "Create a coverage policy, assess a reviewed USGS event, and inspect on-chain evidence on GenLayer Studio Next.",
};

export default function ConsolePage() {
  return <QuakeConsole page="console" />;
}
