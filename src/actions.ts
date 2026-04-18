import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function killProcesses(pids: number[], signal: "kill" | "term" = "term"): Promise<void> {
  if (pids.length === 0) return;
  const flag = signal === "kill" ? "-9" : "-15";
  await execAsync(`kill ${flag} ${pids.join(" ")}`);
}
