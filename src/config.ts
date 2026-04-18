import fs from 'fs';
import path from 'path';
import os from 'os';

export interface HarbrConfig {
  sortKey: "pid" | "command" | "port";
  sortAsc: boolean;
}

const DEFAULT_CONFIG: HarbrConfig = {
  sortKey: "pid",
  sortAsc: true,
};

const CONFIG_PATH = path.join(os.homedir(), '.harbr.json');

export function loadConfig(): HarbrConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (err) {
    // Silently fallback to defaults if corrupt or unreadable
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: HarbrConfig): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    // Ignore save errors
  }
}
