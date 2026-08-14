// Sobe a infra de dev (Mongo + Redis + mongo-express) antes da API/web subirem.
// Existe porque "docker compose up" falhando com erro de pipe do Docker Desktop
// (engine não iniciado) é o jeito mais comum de "npm run dev:full" travar sem
// explicação — este script trata isso em vez de deixar o erro cru do compose.
import { execSync, spawn } from "node:child_process";
import net from "node:net";

const COMPOSE_FILE = "api/docker-compose.yml";
const MONGO_PORT = 27018;
const DOCKER_START_TIMEOUT_MS = 90_000;
const MONGO_READY_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 2_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDockerUp() {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function tryLaunchDockerDesktop() {
  if (process.platform !== "win32") return false;
  const candidates = [
    `${process.env["ProgramFiles"]}\\Docker\\Docker\\Docker Desktop.exe`,
    `${process.env["ProgramW6432"]}\\Docker\\Docker\\Docker Desktop.exe`,
  ].filter(Boolean);

  for (const exe of candidates) {
    try {
      spawn(exe, [], { detached: true, stdio: "ignore" }).unref();
      return true;
    } catch {
      // tenta o próximo candidato
    }
  }
  return false;
}

async function waitForDocker() {
  if (isDockerUp()) return true;

  console.log("[dev-infra] Docker Desktop não está rodando.");
  const launched = tryLaunchDockerDesktop();
  console.log(
    launched
      ? "[dev-infra] Iniciando Docker Desktop, aguardando engine subir..."
      : "[dev-infra] Não encontrei o executável do Docker Desktop — inicie manualmente.",
  );

  const deadline = Date.now() + DOCKER_START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (isDockerUp()) {
      console.log("[dev-infra] Docker engine no ar.");
      return true;
    }
    process.stdout.write(".");
    await sleep(POLL_INTERVAL_MS);
  }
  console.log("");
  return false;
}

function isMongoReachable() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port: MONGO_PORT, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(1_000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForMongo() {
  const deadline = Date.now() + MONGO_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isMongoReachable()) {
      console.log("[dev-infra] Mongo aceitando conexão.");
      return true;
    }
    process.stdout.write(".");
    await sleep(1_000);
  }
  console.log("");
  return false;
}

async function main() {
  const dockerReady = await waitForDocker();
  if (!dockerReady) {
    console.error(
      "[dev-infra] Docker não subiu a tempo. Abra o Docker Desktop manualmente e rode `npm run dev:full` de novo.",
    );
    process.exit(1);
  }

  console.log("[dev-infra] docker compose up -d...");
  execSync(`docker compose -f ${COMPOSE_FILE} up -d`, { stdio: "inherit" });

  const mongoReady = await waitForMongo();
  if (!mongoReady) {
    console.error(
      `[dev-infra] Mongo não respondeu em ${MONGO_READY_TIMEOUT_MS / 1000}s. Confira \`docker compose -f ${COMPOSE_FILE} logs mongo\`.`,
    );
    process.exit(1);
  }
}

main();
