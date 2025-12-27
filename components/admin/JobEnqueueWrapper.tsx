"use client";

import { useRouter } from "next/navigation";
import JobEnqueue from "./JobEnqueue";

export default function JobEnqueueWrapper() {
  const router = useRouter();
  
  const handleCreated = () => {
    router.refresh();
  };

  return <JobEnqueue onCreated={handleCreated} />;
}

