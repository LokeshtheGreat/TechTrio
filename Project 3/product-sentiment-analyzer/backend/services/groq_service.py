import os
import json
import logging
import re
from groq import Groq, GroqError

logger = logging.getLogger(__name__)

def extract_json_from_text(text: str) -> str:
    """Finds the first { and last } to extract JSON payload robustly."""
    text = text.strip()
    start_idx = text.find('{')
    end_idx = text.rfind('}')
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        return text[start_idx:end_idx+1]
    return text

def get_groq_client():
    """
    Initializes the Groq client. Expects GROQ_API_KEY in the environment.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None
    return Groq(api_key=api_key)

def get_model_name():
    """
    Retrieves the configured Groq model from environment, defaulting to a fast generic model.
    """
    return os.environ.get("GROQ_MODEL", "allam-2-7b")

def generate_business_insight(system_prompt: str, context_data: str, user_task: str = "") -> dict:
    """
    Generates structured business insights based on the provided context.
    Enforces a strict JSON contract.

    Args:
        system_prompt: The core instructions enforcing rules (e.g. use only supplied evidence).
        context_data: The structured reviews/analytics data.
        user_task: Specific question or task for the model.

    Returns:
        dict: The structured business insight matching the frontend contract, or a controlled error dict.
    """
    client = get_groq_client()
    if not client:
        logger.error("GROQ_API_KEY is missing or invalid.")
        return {"error": "GROQ_API_KEY is missing or invalid. AI service is unavailable."}

    try:
        # Enforce the strict JSON structure requested
        contract_instructions = (
            "\n\nYou MUST return ONLY valid JSON matching this exact structure, with no markdown formatting or extra text:\n"
            "{\n"
            '  "summary": "...",\n'
            '  "likes": ["...", "..."],\n'
            '  "dislikes": ["...", "..."],\n'
            '  "recurringIssues": ["...", "..."],\n'
            '  "areasOfAttention": ["...", "..."]\n'
            "}\n\n"
            "CRITICAL RULES:\n"
            "1. Use ONLY the supplied evidence. Do not invent reviews, statistics, or customer opinions.\n"
            "2. Do not claim something is recurring unless supported by multiple evidence points.\n"
            "3. Distinguish direct evidence from interpretation.\n"
            "4. Keep the response concise and useful.\n"
            "5. Limit ALL arrays to a MAXIMUM of 5 items. Do NOT list more than 5 items per array."
        )

        full_system_prompt = system_prompt + contract_instructions

        messages = [
            {"role": "system", "content": full_system_prompt},
            {"role": "user", "content": f"Context Evidence:\n{context_data}\n\nTask:\n{user_task}"}
        ]

        response = client.chat.completions.create(
            model=get_model_name(),
            messages=messages,
            temperature=0.3,
            max_tokens=1500
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from Groq.")

        # Parse JSON securely
        parsed = json.loads(extract_json_from_text(content))

        # Normalize and guarantee schema
        normalized = {
            "summary": str(parsed.get("summary", "")),
            "likes": parsed.get("likes", []) or [],
            "dislikes": parsed.get("dislikes", []) or [],
            "recurringIssues": parsed.get("recurringIssues", []) or [],
            "areasOfAttention": parsed.get("areasOfAttention", []) or []
        }

        # Ensure arrays are lists
        for k in ["likes", "dislikes", "recurringIssues", "areasOfAttention"]:
            if not isinstance(normalized[k], list):
                normalized[k] = [str(normalized[k])] if normalized[k] else []
                
        return normalized

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Groq response as JSON: {e}")
        return {"error": "AI returned invalid JSON format."}
    except GroqError as e:
        print(f"Groq API Error: {e}")
        logger.error(f"Groq API Error: {e}")
        return {"error": "AI Service Error during processing."}
    except Exception as e:
        logger.error(f"Unexpected error in Groq service: {e}")
        return {"error": "Unexpected error generating insights."}

def generate_consumer_insight(system_prompt: str, context_data: str, user_task: str = "") -> dict:
    """
    Generates structured consumer insights based on the provided context.
    Enforces a strict JSON contract.
    """
    client = get_groq_client()
    if not client:
        return {"error": "GROQ_API_KEY is missing or invalid. AI service is unavailable."}

    try:
        contract_instructions = (
            "\n\nYou MUST return ONLY valid JSON matching this exact structure, with no markdown formatting or extra text:\n"
            "{\n"
            '  "summary": "...",\n'
            '  "strengths": ["...", "..."],\n'
            '  "concerns": ["...", "..."],\n'
            '  "appreciated": ["...", "..."],\n'
            '  "purchase_considerations": ["...", "..."]\n'
            "}\n\n"
            "CRITICAL RULES:\n"
            "1. Use ONLY the supplied evidence. Do not invent specifications, prices, features, or facts outside the supplied evidence.\n"
            "2. Focus on what a potential customer should understand from the collected reviews.\n"
            "3. Keep the response concise, helpful, and consumer-friendly.\n"
            "4. Limit ALL arrays to a MAXIMUM of 5 items. Do NOT list more than 5 items per array."
        )

        full_system_prompt = system_prompt + contract_instructions

        messages = [
            {"role": "system", "content": full_system_prompt},
            {"role": "user", "content": f"Context Evidence:\n{context_data}\n\nTask:\n{user_task}"}
        ]

        response = client.chat.completions.create(
            model=get_model_name(),
            messages=messages,
            temperature=0.3,
            max_tokens=1500
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from Groq.")

        parsed = json.loads(extract_json_from_text(content))

        # Normalize and guarantee schema
        normalized = {
            "summary": str(parsed.get("summary", "")),
            "strengths": parsed.get("strengths", []) or [],
            "concerns": parsed.get("concerns", []) or [],
            "appreciated": parsed.get("appreciated", []) or [],
            "purchase_considerations": parsed.get("purchase_considerations", []) or []
        }

        for k in ["strengths", "concerns", "appreciated", "purchase_considerations"]:
            if not isinstance(normalized[k], list):
                normalized[k] = [str(normalized[k])] if normalized[k] else []
                
        return normalized

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Groq response as JSON: {e}")
        return {"error": "AI returned invalid JSON format."}
    except GroqError as e:
        logger.error(f"Groq API Error: {e}")
        return {"error": "AI Service Error during processing."}
    except Exception as e:
        logger.error(f"Unexpected error in Groq service: {e}")
        return {"error": "Unexpected error generating insights."}


def generate_chatbot_response(context_data: str, query: str) -> str:
    """
    Generates a natural-language answer to a user query based on product evidence.
    """
    client = get_groq_client()
    if not client:
        return "error: GROQ_API_KEY is missing or invalid. AI service is unavailable."

    try:
        system_prompt = (
            "You are an objective AI Review Intelligence Chatbot. "
            "Your task is to answer user questions about a product based strictly on the provided review evidence. "
            "CRITICAL RULES:\n"
            "1. Base your answer ONLY on the supplied evidence. Do not invent specifications, prices, features, or unsupported conclusions.\n"
            "2. If the evidence does not contain the answer, politely state that you do not have enough information based on the reviews.\n"
            "3. Be concise and conversational, but strictly objective.\n"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Context Evidence:\n{context_data}\n\nQuestion:\n{query}"}
        ]

        response = client.chat.completions.create(
            model=get_model_name(),
            messages=messages,
            temperature=0.3,
            max_tokens=1000
        )

        content = response.choices[0].message.content
        if not content:
            return "error: Empty response from Groq."

        return content.strip()

    except Exception as e:
        logger.error(f"Unexpected error in Groq chatbot service: {e}")
        return "error: AI Service Error during processing."
