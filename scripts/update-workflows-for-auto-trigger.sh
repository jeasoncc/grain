#!/bin/bash

# 为依赖 desktop 的工作流添加自动触发功能

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 需要更新的工作流列表（不包括 snap，因为它不依赖 desktop release）
WORKFLOWS=(
    "winget-publish.yml"
    "chocolatey-publish.yml" 
    "scoop-publish.yml"
    "homebrew-publish.yml"
    "ppa-publish.yml"
    "copr-publish.yml"
    "obs-publish.yml"
    "aur-publish.yml"
    "aur-bin-publish.yml"
    "gentoo-publish.yml"
)

echo "🔧 更新工作流以支持自动触发..."

cd "$PROJECT_ROOT"

for workflow in "${WORKFLOWS[@]}"; do
    workflow_path=".github/workflows/$workflow"
    
    if [ ! -f "$workflow_path" ]; then
        echo "⚠️ 跳过不存在的工作流: $workflow"
        continue
    fi
    
    echo "📝 更新 $workflow..."
    
    # 备份原文件
    cp "$workflow_path" "$workflow_path.bak"
    
    # 使用 Python 来更新 YAML 文件（更可靠）
    python3 << EOF
import yaml
import sys

workflow_file = "$workflow_path"

try:
    with open(workflow_file, 'r') as f:
        content = f.read()
    
    # 解析 YAML
    data = yaml.safe_load(content)
    
    # 添加 workflow_run 触发器
    if 'on' in data:
        if 'workflow_run' not in data['on']:
            data['on']['workflow_run'] = {
                'workflows': ["Release Desktop App"],
                'types': ['completed']
            }
            print(f"✅ 添加了 workflow_run 触发器到 $workflow")
        else:
            print(f"ℹ️ $workflow 已有 workflow_run 触发器")
    
    # 更新条件判断
    if 'jobs' in data:
        for job_name, job_data in data['jobs'].items():
            if 'if' in job_data:
                current_if = job_data['if']
                # 检查是否已包含 workflow_run 条件
                if 'workflow_run' not in current_if:
                    # 添加 workflow_run 条件
                    if isinstance(current_if, str):
                        new_if = f"{current_if} || (github.event_name == 'workflow_run' && github.event.workflow_run.conclusion == 'success')"
                        job_data['if'] = new_if
                        print(f"✅ 更新了 {job_name} 的条件判断")
                break  # 只更新第一个 job
    
    # 写回文件
    with open(workflow_file, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)
    
except Exception as e:
    print(f"❌ 更新 $workflow 失败: {e}")
    # 恢复备份
    import shutil
    shutil.copy(f"$workflow_path.bak", workflow_file)

EOF

    # 删除备份文件
    rm -f "$workflow_path.bak"
    
done

echo ""
echo "✅ 工作流更新完成！"
echo ""
echo "📋 更新的功能："
echo "- 添加了 workflow_run 触发器"
echo "- 当 desktop 工作流完成时自动触发"
echo "- 保持原有的手动和标签触发方式"
echo ""
echo "🚀 现在的发布流程："
echo "1. 运行 npm run tag:desktop"
echo "2. Desktop 构建完成后自动触发其他平台"
echo "3. 或者运行 npm run tag:all 一次性创建所有标签"