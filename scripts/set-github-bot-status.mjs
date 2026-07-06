import fs from "node:fs/promises";

const instructionFile = "portfolio-bot-instructions.json";
const action = (process.argv[2] || "status").toLowerCase();

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return {};
  }
}

const instructions = await readJson(instructionFile);

if (action === "stop") {
  instructions.enabled = false;
  instructions.lastManualAction = "stop_bot";
  instructions.lastManualActionAt = new Date().toISOString();
  await fs.writeFile(instructionFile, `${JSON.stringify(instructions, null, 2)}\n`);
  console.log("GitHub project bot is now STOPPED. It will not sync repos until start_bot is run.");
  process.exit(0);
}


if (action === "reset") {
  instructions.lastManualAction = "reset_projects";
  instructions.lastManualActionAt = new Date().toISOString();
  await fs.writeFile(instructionFile, `${JSON.stringify(instructions, null, 2)}\n`);
  await fs.writeFile("generated-projects.js", "window.GITHUB_PROJECTS = [];\n");
  console.log("Generated GitHub project cards have been reset. Hardcoded project cards are unchanged.");
  process.exit(0);
}

if (action === "start") {
  instructions.enabled = true;
  instructions.lastManualAction = "start_bot";
  instructions.lastManualActionAt = new Date().toISOString();
  await fs.writeFile(instructionFile, `${JSON.stringify(instructions, null, 2)}\n`);
  console.log("GitHub project bot is now STARTED. You can run sync_once to update projects.");
  process.exit(0);
}

console.log(`GitHub project bot status: ${instructions.enabled === false ? "STOPPED" : "STARTED"}`);
console.log(`${instructionFile}: enabled = ${instructions.enabled !== false}`);
