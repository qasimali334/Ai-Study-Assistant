import os
import json
import logging
from groq import Groq

logger = logging.getLogger(__name__)

class GroqService:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            logger.error("GROQ_API_KEY is not set in environment.")
            raise ValueError("GROQ_API_KEY environment variable is required.")
        self.client = Groq(api_key=self.api_key)
        
        # Define recommended model constants
        self.chat_model = "llama-3.3-70b-versatile"
        self.exam_model = "llama-3.1-8b-instant"

    def answer_tutor_question(self, query: str, context: list[dict]) -> str:
        """
        Runs a RAG prompt against Groq using retrieved document context.
        Strictly explains only what is found in the document, with references.
        """
        # Format retrieval context with explicit source markers
        formatted_context = ""
        for i, item in enumerate(context):
            formatted_context += f"[SOURCE {i+1} — Page {item['page']}]:\n{item['text']}\n\n"

        system_prompt = (
            "You are ExamGenie, a distinguished University Expert Tutor and Academic Mentor. "
            "Your teaching philosophy is to help students truly master their course material by explaining "
            "concepts in your own words with pedagogical clarity, depth, and precision, rather than simply copying, pasting, and concising snippets.\n\n"
            "## CORE INSTRUCTIONS & PEDAGOGY:\n"
            "1. **Teach in Your Own Words**: Understand the provided document fragments first. Translate technical jargon and dry concepts into clear, engaging, and well-structured explanations as if teaching a university student. Avoid robotic copy-pasting.\n"
            "2. **Integrate Illustrative Examples**: Add relevant, concrete examples to clarify complex, abstract, or highly technical concepts whenever it aids student comprehension.\n"
            "3. **Synthesize Similar Concepts**: If multiple source fragments discuss the same topic or spread it across different pages, synthesize and merge them into a single, cohesive explanation rather than reviewing the fragments sequentially or repeating facts.\n"
            "4. **Strict Grounding (No External Facts)**: NEVER invent facts, statistics, historical dates, or technical information outside what is explicitly stated in the provided document fragments. All factual claims must be strictly backed by the notes. Answer ONLY using the provided material.\n"
            "5. **Handling Missing Topics**: If the user's question is not discussed or is missing in the provided fragments, reply EXACTLY with: "
            "'This topic is not provided in the given document. Please upload the relevant study material.' Do not attempt to guess or answer from external knowledge.\n"
            "6. **Natural Citations**: Keep clean, natural inline page citations (e.g., **(Page X)**) at the end of key sentences or paragraphs to ground your explanation, keeping the overall flow smooth and readable.\n"
            "7. **Exhaustive Document Walkthroughs**: If the student's query asks to summarize the entire document, prepare it from page 1 to the end, or structure a presentation outline, DO NOT output a short 5-paragraph summary. Instead, generate a highly comprehensive, chapter-by-chapter/section-by-section study walkthrough (similar to Claude). Extract all core details, technical approaches, tables, Q&As, objectives, software requirements, architecture layers, methodologies, and limitations from the notes. Make it as exhaustive and detailed as possible to allow the student to learn everything."
        )

        user_content = (
            f"DOCUMENT SOURCE FRAGMENTS:\n{formatted_context}\n\n"
            f"STUDENT QUERY: {query}\n\n"
            "INSTRUCTION: Base your response strictly on the source fragments. Act as a professional University Tutor, "
            "explaining the material in your own words, combining duplicate topics, adding helpful examples, "
            "and formatting clearly with markdown. If the student asks for full-document summary or presentation "
            "preparation, go through the fragments systematically and provide an exhaustive, chapter-by-chapter, "
            "highly detailed study walkthrough containing all lists, tables, key approaches, and Q&As."
        )

        try:
            completion = self.client.chat.completions.create(
                model=self.chat_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.1,
                max_tokens=4096
            )
            return completion.choices[0].message.content
        except Exception as e:
            logger.error(f"Error calling Groq Chat Completion: {e}")
            return "Sorry, I encountered an error communicating with the AI tutoring service."


    def generate_exam(self, exam_type: str, context: list[dict], count: int = 5) -> dict:
        """
        Generates a set of MCQs or short-answer exam questions from document text.
        Leverages Groq's JSON response capability.
        """
        formatted_context = "\n".join([f"Page {c['page']}: {c['text']}" for c in context])

        if exam_type == "mcq":
            json_schema_desc = (
                "{\n"
                "  \"questions\": [\n"
                "    {\n"
                "      \"question\": \"Question text here\",\n"
                "      \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],\n"
                "      \"correct_answer\": \"The exact string of the correct option matching one of the 4 options\",\n"
                "      \"explanation\": \"Detailed explanation of why this option is correct\"\n"
                "    }\n"
                "  ]\n"
                "}"
            )
        else:
            # short or long questions
            json_schema_desc = (
                "{\n"
                "  \"questions\": [\n"
                "    {\n"
                "      \"question\": \"Question text here\",\n"
                "      \"model_answer\": \"A sample high-scoring answer\",\n"
                "      \"marking_rubric\": \"Brief details on what keywords or ideas are required to earn points\"\n"
                "    }\n"
                "  ]\n"
                "}"
            )

        system_prompt = (
            "You are ExamGenie, an expert curriculum evaluator. Your task is to generate academic-level questions "
            "strictly based on the textbook context provided by the user. Do not introduce outside syllabus concepts.\n\n"
            f"Generate exactly {count} {exam_type.upper()} questions.\n"
            "You MUST respond ONLY with a valid JSON object matching the following structure:\n"
            f"{json_schema_desc}"
        )

        user_content = f"TEXTBOOK CONTEXT:\n{formatted_context}"

        try:
            completion = self.client.chat.completions.create(
                model=self.exam_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=2048
            )
            
            raw_response = completion.choices[0].message.content
            return json.loads(raw_response)
        except Exception as e:
            logger.error(f"Error generating exam with Groq: {e}")
            return {"error": "Failed to generate exam questions", "details": str(e)}

    def analyze_trends(self, context: list[dict]) -> dict:
        """
        Analyzes past exam papers to isolate repeating topics and predict trends.
        """
        formatted_context = "\n".join([f"Page {c['page']}: {c['text']}" for c in context])

        system_prompt = (
            "You are a professional syllabus analyst. Review the provided fragments of historical past exam papers.\n"
            "Perform three steps:\n"
            "1. Extract recurring topics/themes mentioned across the papers and estimate their frequency.\n"
            "2. Predict at least 6 to 8 topics most likely to be tested in the next upcoming exam. For each topic, "
            "provide a highly accurate probability/confidence percentage (e.g., 70% or 80%) representing the exact "
            "chances that this topic will be queried in the exam. Rank these topics in descending order of confidence. "
            "Provide a detailed, structured, and well-reasoned explanation under 'reasoning' justifying the prediction based "
            "on the patterns found in the papers.\n"
            "3. Offer a summary overview of the exam style (e.g. calculation-focused, concept-heavy, diagram-required).\n\n"
            "You MUST return ONLY a JSON object matching this structure:\n"
            "{\n"
            "  \"recurring_topics\": [\n"
            "     { \"topic\": \"Topic Name\", \"frequency\": 4, \"description\": \"Short summary of how it is tested\" }\n"
            "  ],\n"
            "  \"predicted_topics\": [\n"
            "     { \"topic\": \"Topic Name\", \"confidence\": 85, \"reasoning\": \"Why this is predicted to repeat, citing specific frequency and question styles\" }\n"
            "  ],\n"
            "  \"summary\": \"Overall narrative analysis of the paper style.\"\n"
            "}"
        )

        try:
            completion = self.client.chat.completions.create(
                model=self.chat_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": formatted_context}
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=1500
            )
            return json.loads(completion.choices[0].message.content)
        except Exception as e:
            logger.error(f"Error predicting patterns with Groq: {e}")
            return {"error": "Failed to analyze trend data", "details": str(e)}
