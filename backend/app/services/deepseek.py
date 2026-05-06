import json
import logging
import re
import time
from pathlib import Path

logger = logging.getLogger(__name__)

MOCK_SHOTS = [
    {
        "shot_number": 1,
        "shot_type": "全景",
        "duration_sec": 4.0,
        "content": "清晨的城市街道，阳光透过薄雾洒在湿漉漉的柏油路面上。一个年轻人背着双肩包从远处走来，步伐轻快。路边的咖啡店还挂着'营业中'的牌子。",
        "atmosphere": "宁静、充满希望",
        "ai_prompt": "A wide shot of a morning city street, thin fog, sunlight filtering through, wet asphalt reflecting light, a young man with a backpack walking towards the camera, coffee shop with 'open' sign, cinematic lighting, warm color palette, soft dewdrops on windows, 8k, photorealistic, film grain",
    },
    {
        "shot_number": 2,
        "shot_type": "中景",
        "duration_sec": 3.5,
        "content": "年轻人停在咖啡店门前，抬头看了一眼招牌，嘴角微微上扬。他伸手推开玻璃门，门上的风铃发出清脆的声响。",
        "atmosphere": "轻松、期待",
        "ai_prompt": "Medium shot of a young man stopping in front of a cozy coffee shop, looking up at the sign with a slight smile, hand reaching for the glass door handle, wind chimes on the door, golden hour lighting, warm amber tones, shallow depth of field, 8k, cinematic composition",
    },
    {
        "shot_number": 3,
        "shot_type": "特写",
        "duration_sec": 2.5,
        "content": "风铃轻轻晃动，阳光在金属表面跳跃。画面切到年轻人推开门的瞬间，门缝中透出咖啡店内的暖黄灯光和咖啡机的蒸汽。",
        "atmosphere": "温馨、细腻",
        "ai_prompt": "Close-up of brass wind chimes gently swaying, sunlight sparkling on metal surface, shallow depth of field with cozy coffee shop interior visible through door gap, warm yellow light, steam rising from espresso machine, dreamy bokeh background, 8k, macro details",
    },
    {
        "shot_number": 4,
        "shot_type": "中近景",
        "duration_sec": 4.0,
        "content": "年轻人走到吧台前，摘下背包放在脚边。他看向菜单板，眼神中带着好奇，随后对店员微笑着说出点单。店员熟练地操作咖啡机，蒸汽嘶嘶作响。",
        "atmosphere": "日常、亲切",
        "ai_prompt": "Medium close-up shot inside a coffee shop, young man approaching the counter, taking off backpack, looking at menu board with curiosity, smiling at barista, barista working on espresso machine, steam hissing, warm interior lighting, wooden textures, cozy atmosphere, cinematic color grading",
    },
]

MODEL_MAP = {
    "flash": "deepseek-chat",
    "pro": "deepseek-reasoner",
}


def _load_clean_prompt() -> tuple[str, str]:
    prompt_dir = Path(__file__).parent.parent.parent / "prompts"
    path = prompt_dir / "scripts_clean.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data["system_prompt"], data["user_template"]


def clean_script(script_text: str, api_key: str) -> str:
    """Clean raw script text using DeepSeek."""
    from openai import OpenAI

    system_prompt, user_template = _load_clean_prompt()
    user_message = user_template.replace("{content}", script_text)

    client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    )
    return (response.choices[0].message.content or script_text).strip()


def _load_prompt() -> tuple[str, str]:
    prompt_dir = Path(__file__).parent.parent.parent / "prompts"
    path = prompt_dir / "storyboard_split.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data["system_prompt"], data["user_template"]


def _extract_json(text: str) -> list[dict] | None:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
        text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict) and "shots" in parsed:
            return parsed["shots"]
    except json.JSONDecodeError:
        pass
    match = re.search(r"\[\s*\{.*\}\s*\]", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return None


def _call_deepseek(api_key: str, model: str, script_text: str) -> list[dict]:
    from openai import OpenAI

    system_prompt, user_template = _load_prompt()
    user_message = user_template.replace("{script_text}", script_text)
    deepseek_model = MODEL_MAP.get(model, "deepseek-chat")

    client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")

    kwargs = {
        "model": deepseek_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    }
    if model != "pro":
        kwargs["response_format"] = {"type": "json_object"}

    response = client.chat.completions.create(**kwargs)
    content = response.choices[0].message.content or ""

    shots = _extract_json(content)
    if shots is None:
        raise ValueError(f"Failed to parse JSON from model response: {content[:200]}")
    return shots


def _generate_mock_from_script(script_text: str) -> list[dict]:
    """Parse script text into simple shots for preview purposes."""
    import re
    parts = re.split(r"[。！？，,\n]+", script_text.strip())
    parts = [p.strip() for p in parts if p.strip()]
    if not parts:
        parts = [script_text.strip()]

    shot_types = ["全景", "中景", "近景", "特写", "中景", "全景"]
    modified = []
    for i, part in enumerate(parts[:12]):
        modified.append({
            "shot_number": i + 1,
            "shot_type": shot_types[i % len(shot_types)],
            "duration_sec": 3.0 + (i % 3) * 0.5,
            "content": part,
            "atmosphere": "日常" if i % 2 == 0 else "紧张",
            "ai_prompt": f"{part}，电影级布光，写实风格，4K画质，自然色调",
        })
    return modified


def generate_storyboard(
    script_text: str,
    model: str = "flash",
    api_key: str | None = None,
) -> list[dict]:
    if not api_key:
        logger.info("No API key provided, generating preview from script")
        return _generate_mock_from_script(script_text)

    last_error = None
    for attempt in range(3):
        try:
            return _call_deepseek(api_key, model, script_text)
        except Exception as e:
            last_error = e
            logger.warning("DeepSeek API attempt %d/3 failed: %s", attempt + 1, e)
            if attempt < 2:
                time.sleep(2 ** (attempt + 1))

    logger.error("All 3 DeepSeek API attempts failed: %s", last_error)
    raise RuntimeError(f"AI 拆解失败，请稍后重试: {last_error}")
