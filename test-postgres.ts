import si from 'systeminformation';
(async () => {
    const connections = await si.networkConnections();
    const pgConns = connections.filter(c => c.localPort === '5432' || c.localPort === 5432 || c.localPort === 5433 || c.localPort === '5433');
    console.log("Port 5432/5433 connections:", pgConns);
})();
