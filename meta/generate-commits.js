import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoUrl = "https://github.com/ishaantibdewal/dsc106_portfolio";
const outputPath = join(__dirname, "commits.json");

function getFileType(file) {
  const extension = file.split(".").pop();

  if (!extension || extension === file) {
    return "other";
  }

  return extension.toLowerCase();
}

const log = execFileSync(
  "git",
  [
    "log",
    "--pretty=format:--COMMIT--%x09%H%x09%h%x09%an%x09%ae%x09%aI%x09%s",
    "--numstat",
  ],
  { encoding: "utf8" }
);

const commits = [];
let currentCommit;

for (let line of log.split("\n")) {
  if (line.startsWith("--COMMIT--")) {
    const [, id, shortId, author, email, datetime, message] = line.split("\t");
    const date = new Date(datetime);

    currentCommit = {
      id,
      shortId,
      url: `${repoUrl}/commit/${id}`,
      author,
      email,
      message,
      date: datetime.slice(0, 10),
      time: datetime.slice(11, 19),
      timezone: datetime.slice(19),
      datetime,
      hourFrac: date.getHours() + date.getMinutes() / 60,
      totalLines: 0,
      lines: [],
    };

    commits.push(currentCommit);
    continue;
  }

  if (!line.trim() || !currentCommit) {
    continue;
  }

  const [addedRaw, deletedRaw, file] = line.split("\t");
  const added = Number(addedRaw) || 0;
  const deleted = Number(deletedRaw) || 0;
  const changedLines = added + deleted;

  currentCommit.totalLines += changedLines;
  currentCommit.lines.push({
    file,
    type: getFileType(file),
    added,
    deleted,
    changedLines,
  });
}

writeFileSync(outputPath, JSON.stringify(commits, null, 2) + "\n");
