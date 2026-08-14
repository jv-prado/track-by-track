#!/usr/bin/env node
// Kills whatever is listening on the given port before dev startup.
// Needed because ctrl+c doesn't always reach the nested nest/concurrently
// process tree on Windows, leaving an orphan holding the port (EADDRINUSE).
const { execSync } = require("node:child_process");

const port = process.argv[2];
if (!port) {
    console.error("usage: node free-port.js <port>");
    process.exit(1);
}

function killWindows(port) {
    let out;
    try {
        out = execSync(`netstat -ano -p tcp`, { encoding: "utf8" });
    } catch {
        return;
    }
    const pids = new Set();
    for (const line of out.split("\n")) {
        const m = line.match(/^\s*TCP\s+\S*:(\d+)\s+\S+\s+LISTENING\s+(\d+)/i);
        if (m && m[1] === String(port)) pids.add(m[2]);
    }
    for (const pid of pids) {
        try {
            execSync(`taskkill /PID ${pid} /F /T`, { stdio: "ignore" });
            console.log(`free-port: killed PID ${pid} on port ${port}`);
        } catch {
            // already gone
        }
    }
}

function killUnix(port) {
    let out;
    try {
        out = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" });
    } catch {
        return;
    }
    for (const pid of out.split("\n").map((s) => s.trim()).filter(Boolean)) {
        try {
            execSync(`kill -9 ${pid}`, { stdio: "ignore" });
            console.log(`free-port: killed PID ${pid} on port ${port}`);
        } catch {
            // already gone
        }
    }
}

if (process.platform === "win32") killWindows(port);
else killUnix(port);
