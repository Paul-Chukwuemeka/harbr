import React, { useEffect, useState, useMemo } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { getOpenPorts, type ProcessGroup } from "./ports.js";
import { killProcesses } from "./actions.js";
import { loadConfig, saveConfig, type HarbrConfig } from "./config.js";

type SortKey = "pid" | "command" | "port";

export default function App() {
  const [renderError, setRenderError] = useState<any>(null);

  useEffect(() => {
    const handleError = (e: any) => {
      setRenderError(e);
    };
    process.on("uncaughtException", handleError);
    return () => {
      process.off("uncaughtException", handleError);
    };
  }, []);

  if (renderError) {
    return (
      <Box padding={1} borderStyle="round" borderColor="red">
        <Text color="red" bold>CRITICAL ERROR</Text>
        <Text>{renderError.message}</Text>
      </Box>
    );
  }

  return <MainApp />;
}

function MainApp() {
  const { stdout } = useStdout();
  const [dimensions, setDimensions] = useState({
    width: stdout.columns || 80,
    height: stdout.rows || 24,
  });

  const [groups, setGroups] = useState<ProcessGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [markedPids, setMarkedPids] = useState<Set<number>>(new Set());
  const [killedPids, setKilledPids] = useState<Set<number>>(new Set());
  const [filterStr, setFilterStr] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"kill" | "term" | null>(null);
  
  const [config, setConfig] = useState<HarbrConfig>(loadConfig());
  const sortKey = config.sortKey;
  const sortAsc = config.sortAsc;
  
  const [toast, setToast] = useState<string | null>(null);

  const [scrollOffset, setScrollOffset] = useState(0);
  const VISIBLE_WINDOW = Math.max(1, Math.floor((dimensions.height - 18) / 3)) || 5;

  useEffect(() => {
    saveConfig(config);
  }, [config]);

  useEffect(() => {
    const onResize = () => {
      setDimensions({ width: stdout.columns, height: stdout.rows });
    };
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  const fetchPorts = async () => {
    const data = await getOpenPorts();
    setGroups(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPorts();
    const interval = setInterval(() => {
      if (!isFiltering && !isConfirming && killedPids.size === 0) {
        fetchPorts();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isFiltering, isConfirming, killedPids.size]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const executeAction = async () => {
    const pidsToKill = markedPids.size > 0 
      ? Array.from(markedPids) 
      : [sortedFilteredGroups[selectedIndex]?.pid].filter(Boolean) as number[];

    if (pidsToKill.length === 0) return;

    try {
      await killProcesses(pidsToKill, confirmAction === "kill" ? "kill" : "term");
      showToast(`Sent SIG${confirmAction === "kill" ? "KILL" : "TERM"} to ${pidsToKill.length} process(es)`);
      
      const killed = new Set(pidsToKill);
      setKilledPids(prev => new Set([...prev, ...killed]));
      
      setTimeout(async () => {
        setKilledPids(prev => {
          const next = new Set(prev);
          killed.forEach(pid => next.delete(pid));
          return next;
        });
        await fetchPorts();
      }, 1500);
    } catch (err) {
      showToast(`Error terminating processes`);
    }

    setMarkedPids(new Set());
    setIsConfirming(false);
    setConfirmAction(null);
  };

  const sortedFilteredGroups = useMemo(() => {
    let res = groups.filter(g => {
      if (!filterStr) return true;
      const lower = filterStr.toLowerCase();
      return (
        g.process.toLowerCase().includes(lower) ||
        g.ports.some(p => p.localPort.includes(lower) || p.localAddress.includes(lower))
      );
    });

    res.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "pid") cmp = a.pid - b.pid;
      else if (sortKey === "command") cmp = a.process.localeCompare(b.process);
      else if (sortKey === "port") {
        const minA = Math.min(...a.ports.map(p => parseInt(p.localPort) || 0));
        const minB = Math.min(...b.ports.map(p => parseInt(p.localPort) || 0));
        cmp = minA - minB;
      }
      return sortAsc ? cmp : -cmp;
    });

    return res;
  }, [groups, filterStr, sortKey, sortAsc]);

  useEffect(() => {
    if (selectedIndex >= sortedFilteredGroups.length && sortedFilteredGroups.length > 0) {
      setSelectedIndex(sortedFilteredGroups.length - 1);
    } else if (sortedFilteredGroups.length === 0) {
      setSelectedIndex(0);
    }
  }, [sortedFilteredGroups.length, selectedIndex]);

  useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(Math.max(0, selectedIndex));
    } else if (selectedIndex >= scrollOffset + VISIBLE_WINDOW) {
      setScrollOffset(Math.max(0, selectedIndex - VISIBLE_WINDOW + 1));
    }
  }, [selectedIndex, scrollOffset, VISIBLE_WINDOW]);

  useInput((input, key) => {
    if (isFiltering) {
      if (key.return || key.escape) {
        setIsFiltering(false);
      } else if (key.backspace || key.delete) {
        setFilterStr(prev => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setFilterStr(prev => prev + input);
      }
      return;
    }

    if (isConfirming) {
      if (input.toLowerCase() === "y" || key.return) {
        executeAction();
      } else if (input.toLowerCase() === "n" || key.escape) {
        setIsConfirming(false);
        setConfirmAction(null);
      }
      return;
    }

    if (sortedFilteredGroups.length === 0) {
      if (input === "/") setIsFiltering(true);
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => (prev === 0 ? sortedFilteredGroups.length - 1 : prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev === sortedFilteredGroups.length - 1 ? 0 : prev + 1));
    } else if (input === " ") {
      const p = sortedFilteredGroups[selectedIndex];
      if (p) {
        setMarkedPids(prev => {
          const next = new Set(prev);
          if (next.has(p.pid)) next.delete(p.pid);
          else next.add(p.pid);
          return next;
        });
      }
    } else if (key.return) {
      setConfirmAction("kill");
      setIsConfirming(true);
    } else if (input === "t") {
      setConfirmAction("term");
      setIsConfirming(true);
    } else if (input === "/") {
      setIsFiltering(true);
    } else if (input === "s") {
      setConfig(prev => {
        let nextKey: SortKey = "pid";
        if (prev.sortKey === "pid") nextKey = "command";
        else if (prev.sortKey === "command") nextKey = "port";
        return { ...prev, sortKey: nextKey, sortAsc: true };
      });
    } else if (input === "a") {
      setConfig(prev => ({ ...prev, sortAsc: !prev.sortAsc }));
    }
  });

  if (loading) {
    return (
      <Box padding={1} borderStyle="round" borderColor="cyan">
        <Text color="cyan">{"[ harbr ] probing active connections..."}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="cyan">
      {/* --- HEADER SECTION --- */}
      <Box flexDirection="column" marginBottom={0} gap={0.5} flexShrink={0}>
        <Box>
          <Text color="#FF0080" bold>
            {`  _             _        
 | |_  __ _ _ _| |__ _ _ 
 | ' \\/ _\` | '_| '_ \\ '_|
 |_||_\\__,_|_| |_.__/_|  `}
          </Text>
        </Box>
        <Box justifyContent="space-between" width={50} paddingX={2} marginTop={0}>
          <Text color="#00E5FF">port management</Text>
          <Text color="gray">v1.4.2</Text>
        </Box>
      </Box>

      <Box marginBottom={1} marginTop={1} flexDirection="row" flexWrap="wrap" flexShrink={0} gap={1}>
        <Box><Text color="#00FF41" bold>[↑/↓]</Text><Text color="white"> Navigate</Text></Box>
        <Box><Text color="#FFD700" bold>[Space]</Text><Text color="white"> Mark</Text></Box>
        <Box><Text color="#BB86FC" bold>[t]</Text><Text color="white"> SIGTERM</Text></Box>
        <Box><Text color="#CF6679" bold>[Enter]</Text><Text color="white"> SIGKILL</Text></Box>
        <Box><Text color="#03DAC6" bold>[s]</Text><Text color="white"> Sort ({sortKey})</Text></Box>
        <Box><Text color="#03DAC6" bold>[a]</Text><Text color="white"> Order</Text></Box>
        <Box><Text color="#7F39FB" bold>[/]</Text><Text color="white"> Filter</Text></Box>
        <Box><Text color="#CF6679" bold>[⚠]</Text><Text color="white"> External</Text></Box>
      </Box>

      <Box flexDirection="column" flexShrink={0} marginBottom={1}>
        {filterStr || isFiltering ? (
          <Box borderStyle="single" borderColor="#7F39FB" paddingX={1}>
            <Text color="#7F39FB" bold>🔍 FILTER: </Text>
            <Text color="white">{filterStr}</Text>
            {isFiltering && <Text color="#7F39FB"> █</Text>}
          </Box>
        ) : isConfirming ? (
          <Box borderStyle="single" borderColor={confirmAction === "kill" ? "#CF6679" : "#FFD700"} paddingX={1}>
            <Text color={confirmAction === "kill" ? "#CF6679" : "#FFD700"} bold>
              Send SIG{confirmAction === "kill" ? "KILL" : "TERM"} to {markedPids.size > 0 ? `${markedPids.size} marked` : "highlighted"} process? (y/N)
            </Text>
          </Box>
        ) : toast ? (
          <Box borderStyle="single" borderColor="#03DAC6" paddingX={1}>
            <Text color="#03DAC6" bold>✓ </Text>
            <Text color="white">{toast}</Text>
          </Box>
        ) : (
          <Box paddingX={1}>
            <Text color="gray">System ready. Scanned {groups.length} connections.</Text>
          </Box>
        )}
      </Box>

      {/* --- MAIN LIST --- */}
      <Box flexDirection="column" overflowY="hidden" flexGrow={1}>
        <Box justifyContent="center" width="100%">
          {scrollOffset > 0 && <Text color="gray">  ▲ {scrollOffset} items above ▲</Text>}
        </Box>
        
        {sortedFilteredGroups.length === 0 && (
          <Box justifyContent="center" marginTop={2}>
            <Text color="gray">No active connections matching your criteria</Text>
          </Box>
        )}
        
        {sortedFilteredGroups.slice(scrollOffset, scrollOffset + VISIBLE_WINDOW).map((group, idx) => {
          const absoluteIdx = idx + scrollOffset;
          const isSelected = absoluteIdx === selectedIndex;
          const isMarked = markedPids.has(group.pid);
          const isKilled = killedPids.has(group.pid);
          
          let marker = "  ";
          if (isKilled) marker = "✖ ";
          else if (isSelected) marker = "❯ ";
          else if (isMarked) marker = "◉ ";
          
          const titleColor = isKilled ? "gray" : isMarked ? "#FFD700" : isSelected ? "#00FF41" : "#FF0080";

          return (
            <Box flexDirection="column" key={`${group.pid}-${absoluteIdx}`} marginBottom={0} flexShrink={0}>
              <Box>
                <Box width={3} flexShrink={0}>
                  <Text color={titleColor} bold>{marker}</Text>
                </Box>
                <Box flexShrink={1}>
                  <Text dimColor={isKilled} strikethrough={isKilled} color={titleColor} bold={!isKilled && (isSelected || isMarked)}>
                    {group.process.toUpperCase()}
                  </Text>
                  {isKilled && <Text color="gray"> [TERMINATED]</Text>}
                </Box>
                <Box flexShrink={0} marginLeft={2}>
                  <Text color="gray">PID: </Text>
                  <Text color={isKilled ? "gray" : isSelected ? "#00E5FF" : "white"} bold={isSelected}>{group.pid}</Text>
                </Box>
              </Box>

              <Box flexDirection="column" marginLeft={4} marginTop={0}>
                {group.ports.map((port, pidx) => {
                  const isExposed = port.localAddress === "*" || port.localAddress === "0.0.0.0" || port.localAddress === "::";
                  
                  const portColor = isKilled ? "gray" : isSelected ? "#03DAC6" : "gray";
                  const addrColor = isKilled ? "gray" : isExposed ? "#CF6679" : isSelected ? "white" : "gray";

                  return (
                    <Box key={`${port.localPort}-${pidx}`} gap={2}>
                      <Box width={5} flexShrink={0}>
                        <Text strikethrough={isKilled} color={portColor} bold>{port.protocol.toUpperCase()}</Text>
                      </Box>
                      <Box width={26} flexShrink={1}>
                        <Text strikethrough={isKilled} color={addrColor}>
                          {port.localAddress}
                          {isExposed && !isKilled && <Text color="#CF6679" bold> ⚠</Text>}
                        </Text>
                      </Box>
                      <Box width={10} flexShrink={0}>
                        <Text strikethrough={isKilled} color={isKilled ? "gray" : isSelected ? "#FFD700" : "#00E5FF"} bold>{port.localPort}</Text>
                      </Box>
                      <Box flexShrink={0}>
                        <Text strikethrough={isKilled} color={portColor}>{port.state}</Text>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}

        <Box justifyContent="center" width="100%">
          {scrollOffset + VISIBLE_WINDOW < sortedFilteredGroups.length && (
            <Text color="gray">  ▼ {sortedFilteredGroups.length - (scrollOffset + VISIBLE_WINDOW)} items below ▼</Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}

