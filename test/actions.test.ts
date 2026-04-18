import { describe, it, expect, vi } from 'vitest';
import * as child_process from 'child_process';
import { killProcesses } from '../src/actions.js';

vi.mock('child_process', () => {
  return {
    exec: vi.fn((cmd, callback) => callback(null, { stdout: '', stderr: '' }))
  };
});

describe('actions.ts - killProcesses', () => {
  it('should not call exec if no PIDs provided', async () => {
    await killProcesses([]);
    expect(child_process.exec).not.toHaveBeenCalled();
  });

  it('should call exec with SIGTERM (-15) for term signal', async () => {
    await killProcesses([1337, 8080], 'term');
    const mockExec = vi.mocked(child_process.exec);
    
    // Check that we executed the correct kill command
    expect(mockExec).toHaveBeenCalledWith(
      'kill -15 1337 8080', 
      expect.any(Function)
    );
  });

  it('should call exec with SIGKILL (-9) for kill signal', async () => {
    await killProcesses([999], 'kill');
    const mockExec = vi.mocked(child_process.exec);
    
    expect(mockExec).toHaveBeenCalledWith(
      'kill -9 999', 
      expect.any(Function)
    );
  });
});
