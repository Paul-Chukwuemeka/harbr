import si from 'systeminformation';

export interface ProcessGroup {
  pid: number;
  process: string;
  ports: {
    protocol: string;
    localAddress: string;
    localPort: string;
    state: string;
  }[];
}

export async function getOpenPorts(): Promise<ProcessGroup[]> {
  try {
    const [connections, procs] = await Promise.all([
      si.networkConnections(),
      si.processes()
    ]);
    
    const listening = connections.filter(conn => 
      (conn.state === 'LISTEN' || (conn.protocol === 'udp' && conn.localPort)) && 
      conn.pid
    );
    
    const processMap = new Map<number, string>();
    for (const p of procs.list) {
      if (!p.pid) continue;
      
      let name = p.name || 'Unknown';
      if (name === 'exe') {
        const params = p.params || '';
        if (params.includes('Code') || params.toLowerCase().includes('vscode')) {
          name = 'VS Code Helper';
        } else if (params.toLowerCase().includes('brave')) {
          name = 'Brave Helper';
        } else if (params.toLowerCase().includes('chrome')) {
          name = 'Chrome Helper';
        } else if (params.toLowerCase().includes('discord')) {
          name = 'Discord Helper';
        } else {
          name = 'Chromium/Electron Helper';
        }
      }
      
      processMap.set(p.pid, name);
    }

    const groups = new Map<number, ProcessGroup>();

    for (const c of listening) {
      const pid = c.pid;
      if (!groups.has(pid)) {
        groups.set(pid, {
          pid: c.pid,
          process: processMap.get(pid) || c.process || 'Unknown',
          ports: []
        });
      }
      
      const cleanIp = (c.localAddress || '').split('%')[0] || '*';
      
      groups.get(pid)!.ports.push({
        protocol: c.protocol,
        localAddress: cleanIp,
        localPort: c.localPort,
        state: c.state
      });
    }

    return Array.from(groups.values());
  } catch (err) {
    console.error('Failed to get ports:', err);
    return [];
  }
}
