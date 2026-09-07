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
    const data = JSON.parse(input);

    const model =
      data.model?.display_name ??
      "Unknown";

    const context =
      Math.round(data.context_window?.used_percentage ?? 0);

    const contextSize =
      data.context_window?.context_window_size ?? 0;

    const cost =
      data.cost?.total_cost_usd ?? 0;

    const durationMs =
      data.cost?.total_duration_ms ?? 0;

    const fiveHour =
      data.rate_limits?.five_hour?.used_percentage;

    const sevenDay =
      data.rate_limits?.seven_day?.used_percentage;

    const cwd =
      data.workspace?.current_dir ??
      data.cwd ??
      "";

    const projectName =
      path.basename(cwd);

    const sessionId = data.session_id ?? "default";
    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");

    const progressFile =
      path.join(
        stateDirectory,
        `${safeSessionId}.progress.json`
      );

    let progress = null;

    if (fs.existsSync(progressFile)) {
      try {
        progress = JSON.parse(
          fs.readFileSync(progressFile, "utf8")
        );
      } catch {
        progress = null;
      }
    }

    const taskProgress =
      progress?.percentage ?? null;

    const phase =
      progress?.phase ?? null;

    const activeAgents =
      progress?.activeAgents ?? [];

    const completedAgents =
      progress?.completedAgents ?? [];

    const totalAgents =
      progress?.totalAgents ?? 0;

    const barWidth = 10;

    const filled =
      Math.round(
        (context / 100) * barWidth
      );

    const contextBar =
      "█".repeat(filled) +
      "░".repeat(barWidth - filled);

    const progressText =
      taskProgress === null
        ? "Task: --"
        : `Task: ${taskProgress}%`;

    const phaseText =
      phase
        ? `Phase: ${phase}`
        : "";

    const agentText =
      totalAgents > 0
        ? `Agents: ${activeAgents.length} active / ${completedAgents.length} done / ${totalAgents}`
        : "Agents: 0";

    const durationSeconds =
      Math.floor(durationMs / 1000);

    const minutes =
      Math.floor(durationSeconds / 60);

    const seconds =
      durationSeconds % 60;

    console.log(
      `[${model}] ${projectName} | ${progressText} | ${phaseText}`
    );

    console.log(
      `${agentText} | Context: ${contextBar} ${context}%/${contextSize}`
    );

    const limits = [];

    if (fiveHour != null) {
      limits.push(`5h: ${Math.round(fiveHour)}%`);
    }

    if (sevenDay != null) {
      limits.push(`7d: ${Math.round(sevenDay)}%`);
    }

    const limitsText =
      limits.length > 0
        ? ` | ${limits.join(" | ")}`
        : "";

    console.log(
      `Cost: $${cost.toFixed(2)} | Time: ${minutes}m ${seconds}s${limitsText}`
    );
  } catch {
    console.log("[Claude] status unavailable");
  }
});
