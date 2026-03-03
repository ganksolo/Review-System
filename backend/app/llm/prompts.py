"""
Prompt template management for trade analysis.
"""

SYSTEM_PROMPT = """你是一位专业的交易分析师，擅长归因分析和交易心理学。
你的任务是分析交易记录，区分技能与运气，识别认知偏误，并给出可操作的改进建议。

规则：
1. result_type 只能是以下之一：正确盈利、运气盈利、执行亏损、模式亏损
2. error_level 只能是以下之一：执行层错误、模式层错误、环境层错误（如果 result_type 是"正确盈利"则设为 null）
3. environment_mismatch 为 true 当交易所处的市场环境不适合该交易策略
4. permanent_exclusion 为 true 当交易属于绝对错误行为（无论盈亏都不应该做）
5. action_items 给出 1-3 条具体、可操作的短期改进行动
6. confidence_score 在 0-1 之间，信息越充分越高

你必须严格按照指定的 JSON 格式返回结果，不要返回其他任何内容。"""

_OUTPUT_EXAMPLE = """{
  "result_type": "执行亏损",
  "error_level": "执行层错误",
  "environment_mismatch": false,
  "permanent_exclusion": false,
  "action_items": ["严格执行止损纪律", "减少冲动追高"],
  "long_term_insights": ["建立交易检查清单"],
  "thesis_analysis": "买入论点有一定合理性，但忽视了大盘环境走弱",
  "cognitive_biases": ["锚定效应", "确认偏误"],
  "confidence_score": 0.75,
  "reasoning": "该交易在震荡市中追高买入，缺乏明确止损计划..."
}"""


def build_analysis_prompt(trade_data: dict) -> str:
    """构建交易分析的 user prompt。"""

    return f"""## 交易数据
- 股票: {trade_data.get('stock_code', '?')} ({trade_data.get('stock_name', '?')})
- 账户类型: {trade_data.get('account_type', '?')}
- 交易周期: {trade_data.get('trade_cycle', '?')}
- 买入价: {trade_data.get('entry_price', '?')}, 卖出价: {trade_data.get('exit_price', '?')}
- 仓位: {trade_data.get('position_size', '?')}%
- 盈亏金额: {trade_data.get('pnl_amount', '?')}, 盈亏比: {trade_data.get('pnl_ratio', '?')}%
- 市场环境: {trade_data.get('market_environment', '未填写')}
- 板块阶段: {trade_data.get('sector_status', '未填写')}
- 选股维度: {', '.join(trade_data.get('selection_dimension', [])) or '未填写'}
- 策略模式: {', '.join(trade_data.get('strategy_pattern', [])) or '未填写'}
- 买入论点: {trade_data.get('thesis_statement', '未填写')}
- 计划执行度: {trade_data.get('plan_adherence', '未填写')}
- 止损纪律: {trade_data.get('stop_loss_discipline', '未填写')}
- 离场方式: {trade_data.get('exit_type', '未填写')}
- 离场原因: {trade_data.get('exit_reason', '未填写')}
- 心理状态: {trade_data.get('psychological_state', '未填写')}
- 用户自评正确行为: {trade_data.get('correct_action', '未填写')}

## 输出格式要求
请严格按照以下 JSON 格式返回，所有字段必须填写：
{_OUTPUT_EXAMPLE}

字段说明：
- result_type: "正确盈利" / "运气盈利" / "执行亏损" / "模式亏损"
- error_level: "执行层错误" / "模式层错误" / "环境层错误" / null
- environment_mismatch: true/false
- permanent_exclusion: true/false
- action_items: 1-3 条可操作建议的数组
- long_term_insights: 1-2 条长期改进方向的数组
- thesis_analysis: 买入论点评估文字
- cognitive_biases: 识别的认知偏误数组（可为空数组）
- confidence_score: 0-1 之间的数字
- reasoning: 推理过程说明

只返回 JSON，不要有任何其他文字。"""
