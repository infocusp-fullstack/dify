import json
import sys
import os
from collections import defaultdict

coverage_file = sys.argv[1]
branch_name = sys.argv[2]

modules = ["controllers", "services", "core"]

with open(coverage_file) as f:
    data = json.load(f)

stats = defaultdict(lambda: {"covered": 0, "total": 0})

for file, file_data in data["files"].items():
    if not file.startswith("api/"):
        continue
    parts = file.split("/")
    if len(parts) > 1 and parts[1] in modules:
        mod = parts[1]
        stats[mod]["covered"] += file_data["summary"]["covered_lines"]
        stats[mod]["total"] += file_data["summary"]["num_statements"]

os.makedirs("badge", exist_ok=True)

for module in modules:
    if stats[module]["total"] == 0:
        percent = 0
    else:
        percent = round(100 * stats[module]["covered"] / stats[module]["total"], 2)
    color = "red"
    if percent >= 70:
        color = "brightgreen"
    elif percent >= 60:
        color = "yellow"

    output = {
        "schemaVersion": 1,
        "label": f"{module} coverage",
        "message": f"{percent}%",
        "color": color
    }

    filename = f"badge/{module}-{branch_name}.json"
    with open(filename, "w") as f:
        json.dump(output, f)