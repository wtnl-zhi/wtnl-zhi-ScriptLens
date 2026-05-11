import json
import logging

from openai import OpenAI

logger = logging.getLogger(__name__)

OPTIMIZE_SYSTEM_PROMPT = """你是资深电影分镜优化师，专门为影视项目批量优化分镜头描述。

输入是一组镜头的 JSON 数组，你需要保持 JSON 结构完全不变，只修改指定的字段。

优化策略（按字段）：

1. content（画面内容）优化：
   - 保留原脚本的核心动作和信息
   - 增加视觉细节：光线方向、色彩倾向、画面构图
   - 增加情绪暗示：通过环境细节传递角色心理
   - 增加镜头运动提示（如果合理）
   - 保持简洁有力，不超过 100 字

2. ai_prompt（AI 生图提示词）优化：
   - 按公式重写：[画面主体细节]+[环境氛围]+[光线设计]+[色彩风格]+[镜头语言]+[画质参数]
   - 使用英文关键词
   - 确保可直接粘贴到 Midjourney/Stable Diffusion 使用
   - 包含电影级画质词（如：cinematic, 8k, film grain）

输出规范：
- 只输出 JSON 数组，和输入结构完全一致
- 不要添加任何解释文字
- 不要修改任何其他字段
- 每个镜头都要做优化，不要跳过"""


def batch_optimize_shots(shots_data: list[dict], field: str, api_key: str) -> list[dict]:
    client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")

    user_message = json.dumps(shots_data, ensure_ascii=False, indent=2)
    user_message += f"\n\n请优化以上每个镜头的 [{field}] 字段。"

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": OPTIMIZE_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content or "[]"
    content = content.strip()
    if content.startswith("```"):
        import re
        content = re.sub(r"^```(?:json)?\s*", "", content, flags=re.MULTILINE)
        content = re.sub(r"\s*```$", "", content, flags=re.MULTILINE)

    result = json.loads(content)
    if isinstance(result, dict) and "shots" in result:
        result = result["shots"]
    return result


SHOOTING_SUMMARY_SYSTEM_PROMPT = """你是资深影视制片统筹，擅长从分镜头脚本中提取拍摄计划。

输入是一组分镜头 JSON 数组，包含每个镜头的景别、画面内容、场景、角色、道具等信息。

请生成一份完整的拍摄统筹清单，包含以下部分（用中文）：

## 一、拍摄总览
- 总镜头数
- 预估总拍摄时长
- 涉及场景列表（去重）
- 涉及角色列表（去重）

## 二、场景分组
按场景分组，每组列出：
- 场景名称
- 该场景的镜头数量
- 涉及角色
- 所需道具
- 拍摄注意事项（光线要求、空间限制等）

## 三、所需道具清单
- 所有道具汇总，标明每个道具出现在哪些场景

## 四、角色出镜表
- 每个角色所涉及的场景和镜头数

## 五、拍摄建议
- 推荐的拍摄顺序（按场地/光线优化）
- 需要特别注意的复杂镜头（如特效、特殊布光）
- 节省时间的合并拍摄建议

格式要求：使用 markdown 格式，清晰易读。"""


def generate_shooting_summary(shots_data: list[dict], api_key: str) -> str:
    client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")

    user_message = json.dumps(shots_data, ensure_ascii=False, indent=2)

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": SHOOTING_SUMMARY_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
    )

    return response.choices[0].message.content or "生成失败"
