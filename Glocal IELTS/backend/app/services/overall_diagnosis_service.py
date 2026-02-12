from typing import Any, Dict
from .gemini_service import GeminiService


class OverallDiagnosisService:
    """
    Service to generate comprehensive overall IELTS diagnosis
    by analyzing all 4 skill results using Gemini AI.
    """

    def __init__(self) -> None:
        self.gemini = GeminiService()

    def generate_overall_diagnosis(
        self,
        test_id: str,
        level: str,
        skill_results: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Generate overall IELTS diagnosis with:
        - Overall Band Score
        - Comprehensive ability analysis
        - Strengths & Weaknesses
        - Personalized improvement roadmap
        """
        # Extract band scores
        listening_band = skill_results.get("listening", {}).get("band", 0)
        reading_band = skill_results.get("reading", {}).get("band", 0)
        speaking_band = skill_results.get("speaking", {}).get("band", 0)
        writing_band = skill_results.get("writing", {}).get("band", 0)

        # Calculate overall band (average, rounded to nearest 0.5)
        overall_band = (
            listening_band + reading_band + speaking_band + writing_band
        ) / 4
        overall_band = round(overall_band * 2) / 2  # Round to nearest 0.5

        # Prepare data for Gemini analysis
        system_instruction = """You are an expert IELTS examiner and educational consultant.
Generate a comprehensive, personalized IELTS diagnostic report in Vietnamese.
Your analysis should be detailed, specific, and actionable."""

        prompt = f"""
Dựa trên kết quả kiểm tra IELTS sau đây, hãy tạo một báo cáo phân tích chi tiết bằng tiếng Việt:

**THÔNG TIN BÀI TEST:**
- Mã bài test: {test_id}
- Trình độ: {level}

**KẾT QUẢ 4 KỸ NĂNG:**

1. **LISTENING - Band {listening_band:.1f}**
   - Raw score: {skill_results.get("listening", {}).get("details", {}).get("raw_score", 0)}/{skill_results.get("listening", {}).get("details", {}).get("total_questions", 20)}
   - Detailed results: {len(skill_results.get("listening", {}).get("details", {}).get("detailed_results", []))} questions

2. **READING - Band {reading_band:.1f}**
   - Raw score: {skill_results.get("reading", {}).get("details", {}).get("raw_score", 0)}/{skill_results.get("reading", {}).get("details", {}).get("total_questions", 20)}
   - Detailed results: {len(skill_results.get("reading", {}).get("details", {}).get("detailed_results", []))} questions

3. **SPEAKING - Band {speaking_band:.1f}**
   - Fluency & Coherence: {skill_results.get("speaking", {}).get("details", {}).get("fluency_coherence", "N/A")}
   - Lexical Resource: {skill_results.get("speaking", {}).get("details", {}).get("lexical_resource", "N/A")}
   - Grammatical Range: {skill_results.get("speaking", {}).get("details", {}).get("grammatical_range", "N/A")}
   - Pronunciation: {skill_results.get("speaking", {}).get("details", {}).get("pronunciation", "N/A")}

4. **WRITING - Band {writing_band:.1f}**
   - Task Response: {skill_results.get("writing", {}).get("details", {}).get("task2", {}).get("task_response", "N/A")}
   - Coherence & Cohesion: {skill_results.get("writing", {}).get("details", {}).get("task2", {}).get("coherence_cohesion", "N/A")}
   - Lexical Resource: {skill_results.get("writing", {}).get("details", {}).get("task2", {}).get("lexical_resource", "N/A")}
   - Grammatical Range: {skill_results.get("writing", {}).get("details", {}).get("task2", {}).get("grammatical_range", "N/A")}

**YÊU CẦU BÁO CÁO:**

Tạo báo cáo JSON với cấu trúc sau (PHẢI là JSON hợp lệ, KHÔNG có markdown):

{{
  "overall_band": {overall_band:.1f},
  "skill_bands": {{
    "listening": {listening_band:.1f},
    "reading": {reading_band:.1f},
    "speaking": {speaking_band:.1f},
    "writing": {writing_band:.1f}
  }},
  "detailed_skill_analysis": {{
    "listening": {{
      "overall_performance": "Đánh giá tổng thể về khả năng nghe (80-100 từ)",
      "sections_analysis": [
        {{
          "section": 1,
          "title": "Daily conversation",
          "performance": "Đánh giá chi tiết về section này",
          "key_issues": ["Vấn đề 1", "Vấn đề 2"],
          "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"]
        }},
        {{
          "section": 2,
          "title": "Social monologue",
          "performance": "Đánh giá chi tiết về section này",
          "key_issues": ["Vấn đề 1", "Vấn đề 2"],
          "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"]
        }},
        {{
          "section": 3,
          "title": "Academic conversation",
          "performance": "Đánh giá chi tiết về section này",
          "key_issues": ["Vấn đề 1", "Vấn đề 2"],
          "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"]
        }},
        {{
          "section": 4,
          "title": "Academic lecture",
          "performance": "Đánh giá chi tiết về section này",
          "key_issues": ["Vấn đề 1", "Vấn đề 2"],
          "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"]
        }}
      ]
    }},
    "reading": {{
      "overall_performance": "Đánh giá tổng thể về khả năng đọc (80-100 từ)",
      "passages_analysis": [
        {{
          "passage": 1,
          "title": "Tên passage 1",
          "performance": "Đánh giá chi tiết về passage này",
          "question_types_performance": {{
            "multiple_choice": "Đánh giá",
            "true_false_not_given": "Đánh giá",
            "matching": "Đánh giá"
          }},
          "key_issues": ["Vấn đề 1", "Vấn đề 2"],
          "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"]
        }},
        {{
          "passage": 2,
          "title": "Tên passage 2",
          "performance": "Đánh giá chi tiết về passage này",
          "question_types_performance": {{
            "multiple_choice": "Đánh giá",
            "yes_no_not_given": "Đánh giá",
            "classification": "Đánh giá"
          }},
          "key_issues": ["Vấn đề 1", "Vấn đề 2"],
          "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"]
        }}
      ]
    }},
    "speaking": {{
      "overall_performance": "Đánh giá tổng thể về khả năng nói (80-100 từ)",
      "parts_analysis": [
        {{
          "part": 1,
          "title": "Introduction & Interview",
          "performance": "Đánh giá chi tiết về Part 1",
          "fluency_level": "Mô tả mức độ trôi chảy",
          "vocabulary_usage": "Đánh giá việc sử dụng từ vựng",
          "grammar_accuracy": "Đánh giá độ chính xác ngữ pháp",
          "key_issues": ["Vấn đề 1", "Vấn đề 2"],
          "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"]
        }},
        {{
          "part": 2,
          "title": "Long Turn (Cue Card)",
          "performance": "Đánh giá chi tiết về Part 2",
          "coherence_level": "Mức độ mạch lạc",
          "idea_development": "Khả năng phát triển ý tưởng",
          "time_management": "Quản lý thời gian",
          "key_issues": ["Vấn đề 1", "Vấn đề 2"],
          "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"]
        }},
        {{
          "part": 3,
          "title": "Discussion",
          "performance": "Đánh giá chi tiết về Part 3",
          "analytical_thinking": "Khả năng phân tích",
          "complex_language": "Sử dụng ngôn ngữ phức tạp",
          "opinion_expression": "Diễn đạt quan điểm",
          "key_issues": ["Vấn đề 1", "Vấn đề 2"],
          "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"]
        }}
      ]
    }},
    "writing": {{
      "overall_performance": "Đánh giá tổng thể về khả năng viết (80-100 từ)",
      "tasks_analysis": [
        {{
          "task": 1,
          "title": "Visual Description",
          "performance": "Đánh giá chi tiết về Task 1",
          "overview_quality": "Chất lượng tổng quan",
          "data_selection": "Lựa chọn dữ liệu quan trọng",
          "comparison_ability": "Khả năng so sánh",
          "vocabulary_range": "Đa dạng từ vựng",
          "key_issues": ["Vấn đề 1", "Vấn đề 2"],
          "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"]
        }},
        {{
          "task": 2,
          "title": "Essay Writing",
          "performance": "Đánh giá chi tiết về Task 2",
          "thesis_clarity": "Độ rõ ràng của luận điểm",
          "argument_development": "Phát triển lập luận",
          "paragraph_structure": "Cấu trúc đoạn văn",
          "conclusion_quality": "Chất lượng kết luận",
          "key_issues": ["Vấn đề 1", "Vấn đề 2"],
          "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"]
        }}
      ]
    }}
  }},
  "comprehensive_analysis": {{
    "title": "Phân tích tổng thể năng lực IELTS",
    "summary": "Đoạn văn 150-200 từ phân tích tổng quan về năng lực IELTS của học viên, bao gồm: đánh giá chung về trình độ hiện tại, so sánh điểm số giữa các kỹ năng, xu hướng điểm mạnh và điểm yếu rõ ràng nhất.",
    "proficiency_level": "Mô tả trình độ IELTS tương ứng với band {overall_band:.1f} (ví dụ: Pre-Intermediate, Intermediate, Upper-Intermediate, Advanced)",
    "skill_balance": "Phân tích sự cân bằng giữa 4 kỹ năng: kỹ năng nào nổi trội, kỹ năng nào cần cải thiện, mức độ chênh lệch giữa các kỹ năng"
  }},
  "strengths": {{
    "title": "Điểm mạnh",
    "overall": "Mô tả 2-3 điểm mạnh tổng thể của học viên (100-150 từ)",
    "by_skill": [
      {{
        "skill": "listening",
        "skill_name": "Nghe",
        "points": [
          "Điểm mạnh cụ thể 1 của kỹ năng nghe",
          "Điểm mạnh cụ thể 2 của kỹ năng nghe"
        ]
      }},
      {{
        "skill": "reading",
        "skill_name": "Đọc",
        "points": [
          "Điểm mạnh cụ thể 1 của kỹ năng đọc",
          "Điểm mạnh cụ thể 2 của kỹ năng đọc"
        ]
      }},
      {{
        "skill": "speaking",
        "skill_name": "Nói",
        "points": [
          "Điểm mạnh cụ thể 1 của kỹ năng nói",
          "Điểm mạnh cụ thể 2 của kỹ năng nói"
        ]
      }},
      {{
        "skill": "writing",
        "skill_name": "Viết",
        "points": [
          "Điểm mạnh cụ thể 1 của kỹ năng viết",
          "Điểm mạnh cụ thể 2 của kỹ năng viết"
        ]
      }}
    ]
  }},
  "weaknesses": {{
    "title": "Điểm cần cải thiện",
    "overall": "Mô tả 2-3 điểm yếu tổng thể cần ưu tiên khắc phục (100-150 từ)",
    "by_skill": [
      {{
        "skill": "listening",
        "skill_name": "Nghe",
        "points": [
          "Điểm yếu cụ thể 1 của kỹ năng nghe",
          "Điểm yếu cụ thể 2 của kỹ năng nghe"
        ]
      }},
      {{
        "skill": "reading",
        "skill_name": "Đọc",
        "points": [
          "Điểm yếu cụ thể 1 của kỹ năng đọc",
          "Điểm yếu cụ thể 2 của kỹ năng đọc"
        ]
      }},
      {{
        "skill": "speaking",
        "skill_name": "Nói",
        "points": [
          "Điểm yếu cụ thể 1 của kỹ năng nói",
          "Điểm yếu cụ thể 2 của kỹ năng nói"
        ]
      }},
      {{
        "skill": "writing",
        "skill_name": "Viết",
        "points": [
          "Điểm yếu cụ thể 1 của kỹ năng viết",
          "Điểm yếu cụ thể 2 của kỹ năng viết"
        ]
      }}
    ]
  }},
  "improvement_roadmap": {{
    "title": "Lộ trình cải thiện",
    "introduction": "Giới thiệu tổng quan về lộ trình học tập được đề xuất (50-80 từ)",
    "priority_areas": [
      {{
        "priority": 1,
        "skill": "Tên kỹ năng cần ưu tiên nhất",
        "current_band": 5.0,
        "target_band": 6.0,
        "description": "Giải thích tại sao kỹ năng này cần ưu tiên và mục tiêu cụ thể"
      }},
      {{
        "priority": 2,
        "skill": "Tên kỹ năng ưu tiên thứ 2",
        "current_band": 5.5,
        "target_band": 6.5,
        "description": "Giải thích tại sao kỹ năng này cần ưu tiên và mục tiêu cụ thể"
      }}
    ],
    "phases": [
      {{
        "phase": 1,
        "duration": "4-6 tuần",
        "title": "Giai đoạn 1: Củng cố nền tảng",
        "focus": "Mô tả trọng tâm của giai đoạn này",
        "goals": [
          "Mục tiêu cụ thể 1",
          "Mục tiêu cụ thể 2",
          "Mục tiêu cụ thể 3"
        ],
        "activities": [
          "Hoạt động học tập cụ thể 1",
          "Hoạt động học tập cụ thể 2",
          "Hoạt động học tập cụ thể 3"
        ]
      }},
      {{
        "phase": 2,
        "duration": "4-6 tuần",
        "title": "Giai đoạn 2: Phát triển kỹ năng",
        "focus": "Mô tả trọng tâm của giai đoạn này",
        "goals": [
          "Mục tiêu cụ thể 1",
          "Mục tiêu cụ thể 2",
          "Mục tiêu cụ thể 3"
        ],
        "activities": [
          "Hoạt động học tập cụ thể 1",
          "Hoạt động học tập cụ thể 2",
          "Hoạt động học tập cụ thể 3"
        ]
      }},
      {{
        "phase": 3,
        "duration": "4-6 tuần",
        "title": "Giai đoạn 3: Hoàn thiện và luyện thi",
        "focus": "Mô tả trọng tâm của giai đoạn này",
        "goals": [
          "Mục tiêu cụ thể 1",
          "Mục tiêu cụ thể 2",
          "Mục tiêu cụ thể 3"
        ],
        "activities": [
          "Hoạt động học tập cụ thể 1",
          "Hoạt động học tập cụ thể 2",
          "Hoạt động học tập cụ thể 3"
        ]
      }}
    ],
    "daily_practice": {{
      "title": "Luyện tập hàng ngày",
      "recommendations": [
        "Khuyến nghị luyện tập hàng ngày 1",
        "Khuyến nghị luyện tập hàng ngày 2",
        "Khuyến nghị luyện tập hàng ngày 3",
        "Khuyến nghị luyện tập hàng ngày 4"
      ]
    }},
    "resources": {{
      "title": "Tài nguyên học tập đề xuất",
      "categories": [
        {{
          "category": "Listening",
          "items": [
            "Tài nguyên học Listening 1",
            "Tài nguyên học Listening 2"
          ]
        }},
        {{
          "category": "Reading",
          "items": [
            "Tài nguyên học Reading 1",
            "Tài nguyên học Reading 2"
          ]
        }},
        {{
          "category": "Speaking",
          "items": [
            "Tài nguyên học Speaking 1",
            "Tài nguyên học Speaking 2"
          ]
        }},
        {{
          "category": "Writing",
          "items": [
            "Tài nguyên học Writing 1",
            "Tài nguyên học Writing 2"
          ]
        }}
      ]
    }},
    "estimated_timeline": "12-16 tuần để đạt Band {overall_band + 0.5:.1f} - {overall_band + 1.0:.1f}",
    "motivation": "Lời khuyên và động viên cuối cùng cho học viên (50-80 từ)"
  }}
}}

**LƯU Ý QUAN TRỌNG:**
1. Phân tích phải CỤ THỂ, dựa trên ĐIỂM SỐ và KẾT QUẢ thực tế
2. Không dùng ngôn ngữ chung chung, mơ hồ
3. Lộ trình phải THỰC TẾ, KHẢ THI với học viên Việt Nam
4. Ưu tiên các tài nguyên miễn phí và dễ tiếp cận
5. Output PHẢI là JSON hợp lệ, KHÔNG có markdown code blocks
6. **BẮT BUỘC** phải có đầy đủ 5 field chính:
   - comprehensive_analysis (phân tích tổng quan)
   - detailed_skill_analysis (phân tích chi tiết 4 skills)
   - strengths (điểm mạnh)
   - weaknesses (điểm yếu)
   - improvement_roadmap (lộ trình cải thiện)
7. KHÔNG được bỏ qua bất kỳ field nào, kể cả khi prompt dài
"""

        # Generate diagnosis using Gemini
        try:
            diagnosis_data = self.gemini.generate_json(
                prompt, system_instruction, force_key=1
            )

            # Ensure overall_band is set correctly
            diagnosis_data["overall_band"] = overall_band
            diagnosis_data["test_id"] = test_id
            diagnosis_data["level"] = level

            # Validate all required fields are present
            required_fields = [
                "comprehensive_analysis",
                "strengths",
                "weaknesses",
                "improvement_roadmap",
                "detailed_skill_analysis"
            ]
            
            missing_fields = [f for f in required_fields if f not in diagnosis_data]
            
            if missing_fields:
                print(f"⚠️ Warning: Missing fields from Gemini response: {missing_fields}")
                print("Using enhanced fallback for missing sections...")
                
                # Fill in missing fields with enhanced fallback
                fallback = self._generate_fallback_diagnosis(
                    test_id, level, overall_band,
                    listening_band, reading_band, speaking_band, writing_band,
                    skill_results
                )
                
                for field in missing_fields:
                    diagnosis_data[field] = fallback[field]
            
            return diagnosis_data
            
        except Exception as e:
            print(f"❌ Error generating overall diagnosis: {e}")
            print("Using full fallback diagnosis...")
            # Return fallback structure
            return self._generate_fallback_diagnosis(
                test_id,
                level,
                overall_band,
                listening_band,
                reading_band,
                speaking_band,
                writing_band,
                skill_results,
            )

    def _generate_fallback_diagnosis(
        self,
        test_id: str,
        level: str,
        overall_band: float,
        listening_band: float,
        reading_band: float,
        speaking_band: float,
        writing_band: float,
        skill_results: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """Generate an enhanced fallback diagnosis if Gemini fails."""
        
        # Determine proficiency level
        if overall_band >= 7.0:
            proficiency = "Upper-Intermediate / Advanced"
            level_desc = "có nền tảng vững vàng"
        elif overall_band >= 6.0:
            proficiency = "Intermediate / Upper-Intermediate"
            level_desc = "có nền tảng khá tốt"
        elif overall_band >= 5.0:
            proficiency = "Pre-Intermediate / Intermediate"
            level_desc = "có nền tảng cơ bản"
        else:
            proficiency = "Beginner / Pre-Intermediate"
            level_desc = "đang ở giai đoạn khởi đầu"
        
        # Find strongest and weakest skills
        skills = [
            ("Listening", listening_band),
            ("Reading", reading_band),
            ("Speaking", speaking_band),
            ("Writing", writing_band)
        ]
        sorted_skills = sorted(skills, key=lambda x: x[1], reverse=True)
        strongest = sorted_skills[0]
        weakest = sorted_skills[-1]
        
        # Build comprehensive analysis
        summary = f"""Bạn đã hoàn thành bài kiểm tra IELTS với Overall Band {overall_band:.1f}, {level_desc}. 
Kết quả chi tiết: Listening {listening_band:.1f}, Reading {reading_band:.1f}, Speaking {speaking_band:.1f}, Writing {writing_band:.1f}.

Kỹ năng mạnh nhất của bạn là {strongest[0]} ({strongest[1]:.1f}), cho thấy bạn đã có nền tảng tốt trong việc {
    'tiếp nhận thông tin qua nghe' if strongest[0] == 'Listening' else
    'đọc hiểu và xử lý văn bản' if strongest[0] == 'Reading' else
    'giao tiếp và trình bày ý kiến' if strongest[0] == 'Speaking' else
    'diễn đạt ý tưởng bằng văn bản'
}.

Kỹ năng cần cải thiện nhiều nhất là {weakest[0]} ({weakest[1]:.1f}), đây sẽ là trọng tâm trong lộ trình học tập của bạn."""
        
        skill_balance = f"""Sự chênh lệch giữa kỹ năng cao nhất ({strongest[0]}: {strongest[1]:.1f}) và thấp nhất ({weakest[0]}: {weakest[1]:.1f}) là {strongest[1] - weakest[1]:.1f} band.
{
    'Các kỹ năng của bạn khá cân bằng, đây là dấu hiệu tích cực cho thấy sự phát triển toàn diện.' if (strongest[1] - weakest[1]) <= 0.5 else
    'Có sự chênh lệch nhất định giữa các kỹ năng. Bạn nên tập trung vào kỹ năng yếu hơn để đạt được sự cân bằng.' if (strongest[1] - weakest[1]) <= 1.0 else
    'Có sự chênh lệch đáng kể giữa các kỹ năng. Ưu tiên cải thiện các kỹ năng yếu hơn để nâng Overall Band nhanh chóng.'
}"""
        
        # Build strengths by skill
        strengths_by_skill = []
        skill_data = [
            ("Listening", listening_band, "listening", "Nghe"),
            ("Reading", reading_band, "reading", "Đọc"),
            ("Speaking", speaking_band, "speaking", "Nói"),
            ("Writing", writing_band, "writing", "Viết")
        ]
        
        for skill_name, band, skill_key, skill_vn in skill_data:
            points = []
            if band >= 6.5:
                points.append(f"Đạt band {band:.1f}, cho thấy khả năng {skill_vn.lower()} tốt")
                points.append(f"Có thể xử lý các tình huống {skill_vn.lower()} phức tạp")
            elif band >= 5.5:
                points.append(f"Có nền tảng {skill_vn.lower()} cơ bản vững")
                points.append(f"Đủ khả năng xử lý các tình huống {skill_vn.lower()} thông dụng")
            else:
                points.append(f"Đang phát triển khả năng {skill_vn.lower()} cơ bản")
            
            strengths_by_skill.append({
                "skill": skill_key,
                "skill_name": skill_vn,
                "points": points
            })
        
        # Build weaknesses by skill
        weaknesses_by_skill = []
        for skill_name, band, skill_key, skill_vn in skill_data:
            points = []
            if band < 6.0:
                points.append(f"Cần nâng cao từ band {band:.1f} lên ít nhất 6.0")
                points.append(f"Cần luyện tập nhiều hơn để cải thiện khả năng {skill_vn.lower()}")
            elif band < 7.0:
                points.append(f"Có thể cải thiện từ {band:.1f} lên 7.0+ với luyện tập đều đặn")
            
            if points:
                weaknesses_by_skill.append({
                    "skill": skill_key,
                    "skill_name": skill_vn,
                    "points": points
                })
        
        # Build improvement roadmap
        priority_areas = []
        if weakest[1] < 6.0:
            priority_areas.append({
                "priority": 1,
                "skill": weakest[0],
                "current_band": weakest[1],
                "target_band": min(weakest[1] + 1.0, 7.0),
                "description": f"Kỹ năng {weakest[0]} hiện tại ở mức {weakest[1]:.1f}, cần ưu tiên để nâng lên ít nhất 6.0. Đây là kỹ năng đang kéo Overall Band xuống."
            })
        
        # Add second priority
        second_weakest = sorted_skills[-2]
        if second_weakest[1] < 6.5:
            priority_areas.append({
                "priority": 2,
                "skill": second_weakest[0],
                "current_band": second_weakest[1],
                "target_band": min(second_weakest[1] + 0.5, 7.0),
                "description": f"Sau khi cải thiện {weakest[0]}, tập trung vào {second_weakest[0]} để tăng Overall Band."
            })
        
        return {
            "test_id": test_id,
            "level": level,
            "overall_band": overall_band,
            "skill_bands": {
                "listening": listening_band,
                "reading": reading_band,
                "speaking": speaking_band,
                "writing": writing_band,
            },
            "comprehensive_analysis": {
                "title": "Phân tích tổng thể năng lực IELTS",
                "summary": summary,
                "proficiency_level": proficiency,
                "skill_balance": skill_balance,
            },
            "strengths": {
                "title": "Điểm mạnh",
                "overall": f"Điểm mạnh nổi bật của bạn là kỹ năng {strongest[0]} với band {strongest[1]:.1f}. Đây là nền tảng tốt để phát triển các kỹ năng khác. Hãy tiếp tục duy trì và phát huy thế mạnh này.",
                "by_skill": strengths_by_skill,
            },
            "weaknesses": {
                "title": "Điểm cần cải thiện",
                "overall": f"Kỹ năng {weakest[0]} ({weakest[1]:.1f}) đang là điểm yếu cần ưu tiên cải thiện. Với luyện tập đều đặn và phương pháp đúng, bạn có thể nâng band lên 0.5-1.0 trong 2-3 tháng.",
                "by_skill": weaknesses_by_skill,
            },
            "improvement_roadmap": {
                "title": "Lộ trình cải thiện",
                "introduction": f"Để nâng Overall Band từ {overall_band:.1f} lên {overall_band + 0.5:.1f} - {overall_band + 1.0:.1f}, bạn cần tập trung vào kỹ năng yếu nhất ({weakest[0]}) và luyện tập đều đặn mỗi ngày. Lộ trình dưới đây được thiết kế cho 12-16 tuần.",
                "priority_areas": priority_areas,
                "phases": [
                    {
                        "phase": 1,
                        "duration": "4-6 tuần",
                        "title": "Giai đoạn 1: Củng cố nền tảng",
                        "focus": f"Tập trung cải thiện {weakest[0]} và xây dựng thói quen học tập",
                        "goals": [
                            f"Nâng {weakest[0]} lên 0.5 band",
                            "Luyện tập 4 kỹ năng đều đặn mỗi ngày",
                            "Làm quen với format bài thi IELTS"
                        ],
                        "activities": [
                            f"Luyện {weakest[0]} 45-60 phút/ngày",
                            "Luyện các kỹ năng khác 20-30 phút/ngày",
                            "Làm bài tập thực hành và review lỗi sai"
                        ]
                    },
                    {
                        "phase": 2,
                        "duration": "4-6 tuần",
                        "title": "Giai đoạn 2: Phát triển kỹ năng",
                        "focus": "Tăng độ khó và đa dạng hóa bài tập",
                        "goals": [
                            f"Nâng {weakest[0]} thêm 0.5 band",
                            "Cải thiện tốc độ và độ chính xác",
                            "Phát triển chiến lược làm bài hiệu quả"
                        ],
                        "activities": [
                            "Làm bài test thực tế đầy đủ (mock tests)",
                            "Phân tích điểm mạnh/yếu sau mỗi test",
                            "Học từ vựng chuyên đề và collocation"
                        ]
                    },
                    {
                        "phase": 3,
                        "duration": "4-6 tuần",
                        "title": "Giai đoạn 3: Hoàn thiện và luyện thi",
                        "focus": "Rèn luyện kỹ năng thi thật và quản lý thời gian",
                        "goals": [
                            f"Đạt target band {overall_band + 1.0:.1f}",
                            "Thành thạo chiến lược làm bài",
                            "Tự tin với format thi thật"
                        ],
                        "activities": [
                            "Làm full test (4 kỹ năng) theo đúng thời gian thi",
                            "Review và học từ các lỗi sai",
                            "Tham gia mock test với giám thị (nếu có)"
                        ]
                    }
                ],
                "daily_practice": {
                    "title": "Luyện tập hàng ngày",
                    "recommendations": [
                        f"{weakest[0]}: 45-60 phút (kỹ năng yếu nhất)",
                        "Các kỹ năng khác: 20-30 phút mỗi skill",
                        "Từ vựng: 15-20 phút học từ mới và review",
                        "Review lỗi sai: 15 phút mỗi tối"
                    ]
                },
                "resources": {
                    "title": "Tài nguyên học tập đề xuất",
                    "categories": [
                        {
                            "category": "Listening",
                            "items": [
                                "IELTS Practice Tests (Cambridge 14-18)",
                                "BBC Learning English, TED Talks",
                                "IELTS Listening Mock Tests online"
                            ]
                        },
                        {
                            "category": "Reading",
                            "items": [
                                "IELTS Reading Practice (Cambridge books)",
                                "The Economist, Scientific American",
                                "IELTS Liz, IELTS Simon (websites)"
                            ]
                        },
                        {
                            "category": "Speaking",
                            "items": [
                                "IELTS Speaking Part 1, 2, 3 topics",
                                "Practice with language partners",
                                "Record and self-review"
                            ]
                        },
                        {
                            "category": "Writing",
                            "items": [
                                "IELTS Writing Task 1 & 2 samples",
                                "Simon's IELTS Writing",
                                "Get feedback from teachers/tutors"
                            ]
                        }
                    ]
                },
                "estimated_timeline": f"12-16 tuần để đạt Band {overall_band + 0.5:.1f} - {overall_band + 1.0:.1f}",
                "motivation": "Hãy kiên trì và tự tin! Mỗi ngày luyện tập đều đặn sẽ giúp bạn tiến bộ rõ rệt. Overall Band của bạn hoàn toàn có thể cải thiện 0.5-1.0 band trong 3-4 tháng. Chúc bạn thành công!"
            },
            "detailed_skill_analysis": {
                "listening": {
                    "overall_performance": f"Kỹ năng nghe đạt band {listening_band:.1f}, cho thấy khả năng tiếp nhận thông tin qua nghe ở mức {'tốt' if listening_band >= 6.5 else 'trung bình' if listening_band >= 5.5 else 'cơ bản'}.",
                    "sections_analysis": []
                },
                "reading": {
                    "overall_performance": f"Kỹ năng đọc đạt band {reading_band:.1f}, phản ánh khả năng đọc hiểu và xử lý văn bản ở mức {'tốt' if reading_band >= 6.5 else 'trung bình' if reading_band >= 5.5 else 'cơ bản'}.",
                    "passages_analysis": []
                },
                "speaking": {
                    "overall_performance": f"Kỹ năng nói đạt band {speaking_band:.1f}, thể hiện khả năng giao tiếp và trình bày ý kiến ở mức {'tốt' if speaking_band >= 6.5 else 'trung bình' if speaking_band >= 5.5 else 'cơ bản'}.",
                    "parts_analysis": []
                },
                "writing": {
                    "overall_performance": f"Kỹ năng viết đạt band {writing_band:.1f}, cho thấy khả năng diễn đạt ý tưởng bằng văn bản ở mức {'tốt' if writing_band >= 6.5 else 'trung bình' if writing_band >= 5.5 else 'cơ bản'}.",
                    "tasks_analysis": []
                }
            }
        }
