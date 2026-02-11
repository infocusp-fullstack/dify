import sys
import json
from collections import defaultdict

PR_FILE = sys.argv[1]
MAIN_FILE = sys.argv[2]

THRESHOLD = 70

def load(path):
    with open(path) as f:
        return json.load(f)

def module_stats(data):
    modules = defaultdict(lambda: {"covered":0, "total":0})
    for file, stats in data["files"].items():
        if not file.startswith("api/"):
            continue
        parts = file.split("/")
        if len(parts) < 2:
            continue
        module = parts[1]
        modules[module]["covered"] += stats["summary"]["covered_lines"]
        modules[module]["total"] += stats["summary"]["num_statements"]
    return modules

def compute_percent(m):
    result = {}
    for k,v in m.items():
        if v["total"] == 0:
            result[k] = 0
        else:
            result[k] = round(100*v["covered"]/v["total"],2)
    return result

pr = load(PR_FILE)
main = load(MAIN_FILE)

pr_modules = compute_percent(module_stats(pr))
main_modules = compute_percent(module_stats(main))

overall_pr = round(pr["totals"]["percent_covered"],2)
overall_main = round(main["totals"]["percent_covered"],2)

print("### API Coverage Report\n")
print(f"**Overall Coverage**")
print(f"- PR: {overall_pr}%")
print(f"- Main: {overall_main}%")
print(f"- Delta: {round(overall_pr-overall_main,2)}%\n")

print("| Module | PR | Main | Δ |")
print("|--------|----|------|---|")

all_modules = sorted(set(pr_modules) | set(main_modules))

regression = False

for module in all_modules:
    pr_val = pr_modules.get(module,0)
    main_val = main_modules.get(module,0)
    delta = round(pr_val-main_val,2)

    if delta < 0:
        regression = True

    print(f"| {module} | {pr_val}% | {main_val}% | {delta}% |")

# if overall_pr < THRESHOLD:
#     print("\nOverall coverage below threshold.")
#     sys.exit(1)

# if regression:
#     print("\nCoverage regression detected.")
#     sys.exit(1)
