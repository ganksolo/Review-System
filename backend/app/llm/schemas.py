"""
Pydantic schemas for LLM structured output parsing.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class LLMAnalysisResult(BaseModel):
    """LLM 返回的结构化分析结果"""

    # 归因分析
    result_type: str = Field(description="正确盈利 / 运气盈利 / 执行亏损 / 模式亏损")
    error_level: Optional[str] = Field(None, description="执行层错误 / 模式层错误 / 环境层错误")

    # 检测标记
    environment_mismatch: bool = Field(description="是否存在环境错配")
    permanent_exclusion: bool = Field(description="是否属于永久排除行为")

    # 行动指令
    action_items: List[str] = Field(description="短期可操作行动 (1-3 条)")
    long_term_insights: List[str] = Field(description="长期改进方向 (1-2 条)")

    # 论点分析
    thesis_analysis: str = Field(description="买入论点评估")
    cognitive_biases: List[str] = Field(default_factory=list, description="识别的认知偏误")

    # 置信度
    confidence_score: float = Field(ge=0, le=1, description="分析置信度 0-1")
    reasoning: str = Field(description="推理过程说明")
