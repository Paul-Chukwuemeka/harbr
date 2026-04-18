import { describe, it, expect, vi } from 'vitest';
import * as si from 'systeminformation';
import { getOpenPorts } from '../src/ports.js';

// Mock systeminformation
vi.mock('systeminformation', () => {
  return {
    default: {
      networkConnections: vi.fn(),
      processes: vi.fn()
    }
  };
});

describe('ports.ts - getOpenPorts', () => {
  it('should return successfully grouped processes for listening ports', async () => {
    const mockConnections = [
      { pid: 1000, state: 'LISTEN', localPort: '8080', protocol: 'tcp', localAddress: '0.0.0.0', process: '' },
      { pid: 1000, state: 'LISTEN', localPort: '443', protocol: 'tcp', localAddress: '::', process: '' },
      // Irrelevant connections
      { pid: 1001, state: 'ESTABLISHED', localPort: '22', protocol: 'tcp', localAddress: '127.0.0.1', process: '' },
      { pid: 1002, state: 'LISTEN', localPort: '5432', protocol: 'tcp', localAddress: '127.0.0.1', process: '' },
    ];
    
    const mockProcesses = {
      list: [
        { pid: 1000, name: 'node' },
        { pid: 1002, name: 'postgres' }
      ]
    };

    vi.mocked(si.default.networkConnections).mockResolvedValue(mockConnections as any);
    vi.mocked(si.default.processes).mockResolvedValue(mockProcesses as any);

    const result = await getOpenPorts();

    expect(result).toHaveLength(2); // pid 1000 and 1002

    const nodeGroup = result.find(g => g.pid === 1000);
    expect(nodeGroup).toBeDefined();
    expect(nodeGroup?.process).toBe('node');
    expect(nodeGroup?.ports).toHaveLength(2);
    expect(nodeGroup?.ports[0]?.localPort).toBe('8080');
    
    const pgGroup = result.find(g => g.pid === 1002);
    expect(pgGroup).toBeDefined();
    expect(pgGroup?.process).toBe('postgres');
    expect(pgGroup?.ports).toHaveLength(1);
    expect(pgGroup?.ports[0]?.localPort).toBe('5432');
  });

  it('should map executable names correctly for known environments', async () => {
    const mockConnections = [
      { pid: 2000, state: 'LISTEN', localPort: '3000', protocol: 'tcp', localAddress: '0.0.0.0', process: '' },
    ];
    
    const mockProcesses = {
      list: [
        { pid: 2000, name: 'exe', params: '--user-data-dir=... Code Helper' }
      ]
    };

    vi.mocked(si.default.networkConnections).mockResolvedValue(mockConnections as any);
    vi.mocked(si.default.processes).mockResolvedValue(mockProcesses as any);

    const result = await getOpenPorts();
    
    expect(result).toHaveLength(1);
    expect(result[0]!.process).toBe('VS Code Helper');
  });
});
