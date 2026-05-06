"""
DeepSeek storyboard generation service.

Real implementation would use the OpenAI SDK with custom base_url:

    import openai
    client = openai.AsyncOpenAI(api_key=api_key, base_url="https://api.deepseek.com")
    response = await client.chat.completions.create(
        model=f"deepseek-{model}",
        messages=[...],
        response_format={"type": "json_object"},
    )
"""

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


def generate_storyboard(
    script_text: str,
    model: str = "flash",
    api_key: str | None = None,
) -> list[dict]:
    """
    Generate storyboard shots from script text.

    Args:
        script_text: The script to analyze
        model: Model to use ('flash' or 'reasoner')
        api_key: Optional DeepSeek API key for real API call

    Returns:
        List of shot dicts with shot_number, shot_type, duration_sec, content, atmosphere, ai_prompt

    Real implementation:
        import openai
        client = openai.OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
        response = client.chat.completions.create(
            model=f"deepseek-{model}",
            messages=[
                {"role": "system", "content": "..."},
                {"role": "user", "content": script_text},
            ],
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    """
    return MOCK_SHOTS
