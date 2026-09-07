import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const stateDirectory = path.resolve(scriptDirectory, "..", "state");

let input = "";

process.stdin.on("data", chunk => {
  input += chunk;
});

process.stdin.on("end", () => {
  try {
    const event = JSON.parse(input);
    const sessionId = event.session_id ?? "default";
    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const progressFile = path.join(
      stateDirectory,
      `${safeSessionId}.progress.json`
    );

    fs.mkdirSync(stateDirectory, { recursive: true });

    let progress = {
      percentage: null,
      phase: "Ready",
      activeAgents: [],
      completedAgents: [],
      totalAgents: 0
    };

    if (fs.existsSync(progressFile)) {
      try {
        progress = {
          ...progress,
          ...JSON.parse(fs.readFileSync(progressFile, "utf8"))
        };
      } catch {
        // Replace malformed transient state with a valid progress document.
      }
    }

    const activeAgents = Array.isArray(progress.activeAgents)
      ? progress.activeAgents
      : [];
    const completedAgents = Array.isArray(progress.completedAgents)
      ? progress.completedAgents
      : [];

    if (event.hook_event_name === "SubagentStart") {
      const agent = {
        id: event.agent_id,
        type: event.agent_type,
        status: "running"
      };

      progress.activeAgents = [
        ...activeAgents.filter(item => item.id !== event.agent_id),
        agent
      ];
      progress.completedAgents = completedAgents.filter(
        item => item.id !== event.agent_id
      );
      progress.phase = `Agent: ${event.agent_type}`;
    } else if (event.hook_event_name === "SubagentStop") {
      const stopped = activeAgents.find(item => item.id === event.agent_id);

      progress.activeAgents = activeAgents.filter(
        item => item.id !== event.agent_id
      );
      progress.completedAgents = [
        ...completedAgents.filter(item => item.id !== event.agent_id),
        {
          id: event.agent_id,
          type: event.agent_type ?? stopped?.type ?? "unknown",
          status: "completed"
        }
      ];
      progress.phase =
        progress.activeAgents.length > 0
          ? "Agents running"
          : "Agent work complete";
    }

    progress.totalAgents =
      progress.activeAgents.length + progress.completedAgents.length;

    const temporaryFile = `${progressFile}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryFile, `${JSON.stringify(progress, null, 2)}\n`);
    fs.renameSync(temporaryFile, progressFile);
  } catch (error) {
    console.error(`subagent tracker: ${error.message}`);
    process.exitCode = 1;
  }
});
