import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

async function loadData() {
  const data = await d3.csv("loc.csv", (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + "T00:00" + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

async function loadCommitData() {
  const commits = await d3.json("commits.json");

  return commits.map((commit) => ({
    ...commit,
    datetime: new Date(commit.datetime),
  }));
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
        id: commit,
        url: "https://github.com/ishaantibdewal/dsc106_portfolio/commit/" + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, "lines", {
        value: lines,
        configurable: true,
        writable: true,
        enumerable: false,
      });

      return ret;
    });
}

function renderCommitInfo(data, commits) {
  const files = d3.group(data, (d) => d.file);
  const fileLengths = d3.rollups(
    data,
    (lines) => d3.max(lines, (d) => d.line),
    (d) => d.file
  );
  const fileDepths = d3.rollups(
    data,
    (lines) => d3.max(lines, (d) => d.depth),
    (d) => d.file
  );
  const workByPeriod = d3.rollups(
    data,
    (lines) => lines.length,
    (d) => d.datetime.toLocaleString("en", { dayPeriod: "short" })
  );
  const workByDay = d3.rollups(
    data,
    (lines) => lines.length,
    (d) => d.datetime.toLocaleString("en", { weekday: "long" })
  );
  const longestFile = d3.greatest(fileLengths, (d) => d[1]);
  const longestLine = d3.greatest(data, (d) => d.length);
  const deepestLine = d3.greatest(data, (d) => d.depth);
  const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0];
  const maxDay = d3.greatest(workByDay, (d) => d[1])?.[0];
  const formatNumber = d3.format(",");
  const formatDecimal = d3.format(".1f");
  const stats = {
    totalLoc: data.length,
    commits: commits.length,
    files: files.size,
    authors: d3.group(data, (d) => d.author).size,
    daysWorked: d3.group(data, (d) => d.date.toDateString()).size,
    longestFile,
    averageFileLength: d3.mean(fileLengths, (d) => d[1]),
    averageLineLength: d3.mean(data, (d) => d.length),
    longestLine,
    maxDepth: d3.max(data, (d) => d.depth),
    averageDepth: d3.mean(data, (d) => d.depth),
    averageFileDepth: d3.mean(fileDepths, (d) => d[1]),
    deepestLine,
    maxPeriod,
    maxDay,
  };

  const summaryStats = [
    ["Commits", formatNumber(stats.commits)],
    ["Files", formatNumber(stats.files)],
    ['Total <abbr title="Lines of code">LOC</abbr>', formatNumber(stats.totalLoc)],
    ["Max depth", formatNumber(stats.maxDepth)],
    ["Longest line", formatNumber(stats.longestLine.length)],
    ["Max lines", formatNumber(stats.longestFile[1])],
  ];

  const detailStats = [
    ["Authors", formatNumber(stats.authors)],
    ["Days worked", formatNumber(stats.daysWorked)],
    ["Longest file", `${stats.longestFile[0]} (${formatNumber(stats.longestFile[1])} lines)`],
    ["Average file length", `${formatDecimal(stats.averageFileLength)} lines`],
    ["Average line length", `${formatDecimal(stats.averageLineLength)} characters`],
    ["Longest line location", `${stats.longestLine.file}:${stats.longestLine.line}`],
    ["Average depth", formatDecimal(stats.averageDepth)],
    ["Average file depth", formatDecimal(stats.averageFileDepth)],
    ["Deepest line", `${stats.deepestLine.file}:${stats.deepestLine.line} (depth ${formatNumber(stats.deepestLine.depth)})`],
    ["Most active time", stats.maxPeriod],
    ["Most active day", stats.maxDay],
  ];

  const statsContainer = d3.select("#stats");
  const summary = statsContainer.append("section").attr("class", "stats-summary");
  summary.append("h2").text("Summary");

  const summaryList = summary.append("dl").attr("class", "stats stats-primary");
  for (let [label, value] of summaryStats) {
    const item = summaryList.append("div").attr("class", "stat");
    item.append("dt").html(label);
    item.append("dd").text(value);
  }

  const details = statsContainer.append("details").attr("class", "stats-details");
  details.append("summary").text("View more stats");

  const detailList = details.append("dl").attr("class", "stats stats-secondary");
  for (let [label, value] of detailStats) {
    const item = detailList.append("div").attr("class", "stat");
    item.append("dt").html(label);
    item.append("dd").text(value);
  }
}

function renderTooltipContent(commit) {
  const link = document.getElementById("commit-link");
  const date = document.getElementById("commit-date");
  const time = document.getElementById("commit-time");
  const author = document.getElementById("commit-author");
  const lines = document.getElementById("commit-lines");

  if (Object.keys(commit).length === 0) {
    return;
  }

  link.href = commit.url;
  link.textContent = commit.shortId ?? commit.id;
  date.textContent = commit.datetime?.toLocaleString("en", {
    dateStyle: "full",
  });
  time.textContent = commit.datetime?.toLocaleString("en", {
    timeStyle: "short",
  });
  author.textContent = commit.message
    ? `${commit.author}: ${commit.message}`
    : commit.author;
  lines.textContent = d3.format(",")(commit.totalLines);
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function renderScatterPlot(
  commits,
  {
    chartSelector = "#chart",
    selectionCountSelector = "#selection-count",
    languageBreakdownSelector = "#language-breakdown",
    width = 1000,
    height = 600,
    margin = { top: 10, right: 10, bottom: 30, left: 20 },
  } = {}
) {
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3
    .select(chartSelector)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("overflow", "visible");

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3
    .scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]);
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, "0") + ":00");

  const gridlines = svg
    .append("g")
    .attr("class", "gridlines")
    .attr("transform", `translate(${usableArea.left}, 0)`);

  gridlines.call(d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width));
  gridlines.selectAll(".tick line").attr("stroke", (d) => {
    if (d < 6 || d >= 20) {
      return "oklch(58% 0.14 260)";
    }

    if (d < 12) {
      return "oklch(72% 0.14 75)";
    }

    if (d < 18) {
      return "oklch(68% 0.16 45)";
    }

    return "oklch(62% 0.12 300)";
  });

  svg
    .append("g")
    .attr("transform", `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg
    .append("g")
    .attr("transform", `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  const dots = svg.append("g").attr("class", "dots");

  function isCommitSelected(selection, commit) {
    if (!selection) {
      return false;
    }

    const [[x0, y0], [x1, y1]] = selection;
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);

    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  }

  function renderSelectionCount(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
    const countElement = document.querySelector(selectionCountSelector);

    countElement.textContent = `${selectedCommits.length || "No"} commits selected`;

    return selectedCommits;
  }

  function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
    const container = document.querySelector(languageBreakdownSelector);

    if (selectedCommits.length === 0) {
      container.innerHTML = "";
      return;
    }

    const lines = selectedCommits.flatMap((d) => d.lines);
    const breakdown = d3.rollup(
      lines,
      (v) =>
        d3.sum(v, (line) =>
          "changedLines" in line ? line.changedLines : 1
        ),
      (d) => d.type
    );
    const totalLines = d3.sum(lines, (line) =>
      "changedLines" in line ? line.changedLines : 1
    );

    container.innerHTML = "";

    for (let [language, count] of breakdown) {
      const proportion = count / totalLines;
      const formatted = d3.format(".1~%")(proportion);

      container.innerHTML += `
        <div class="stat">
          <dt>${language}</dt>
          <dd>
            <span>${count} lines</span>
            <span>(${formatted})</span>
          </dd>
        </div>
      `;
    }
  }

  function brushed(event) {
    const selection = event.selection;

    d3.selectAll(".dots circle").classed("selected", (d) =>
      isCommitSelected(selection, d)
    );
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }

  function createBrushSelector(svg) {
    svg.call(d3.brush().on("start brush end", brushed));
    svg.selectAll(".dots, .overlay ~ *").raise();
  }

  dots
    .selectAll("circle")
    .data(sortedCommits)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", (d) => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .style("fill-opacity", 0.7)
    .on("mouseenter", (event, commit) => {
      d3.select(event.currentTarget).style("fill-opacity", 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mousemove", (event) => {
      updateTooltipPosition(event);
    })
    .on("mouseleave", (event) => {
      d3.select(event.currentTarget).style("fill-opacity", 0.7);
      updateTooltipVisibility(false);
    });

  createBrushSelector(svg);
}

let data = await loadData();
let commits;

try {
  commits = await loadCommitData();
} catch {
  commits = processCommits(data);
}

renderCommitInfo(data, commits);
renderScatterPlot(commits);
