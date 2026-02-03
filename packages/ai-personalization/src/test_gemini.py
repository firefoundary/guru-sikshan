import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

api_key = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=api_key)

# Test with minimal prompt
model = genai.GenerativeModel('gemini-2.5-flash')

print("Test 1: Very short prompt")
try:
    response = model.generate_content(
        "Say hello in Hindi in one sentence.",
        generation_config={'max_output_tokens': 100}
    )
    print(f"✅ Success: {response.text}")
except Exception as e:
    print(f"❌ Failed: {e}")

print("\nTest 2: Medium prompt (similar to our use case)")
try:
    response = model.generate_content(
        """Create a short greeting for a teacher named Ravi in Hindi.
        He teaches math in rural Jharkhand.
        Keep it under 50 words.""",
        generation_config={'max_output_tokens': 200}
    )
    print(f"✅ Success: {response.text}")
except Exception as e:
    print(f"❌ Failed: {e}")

print("\nTest 3: Check quota")
try:
    for i in range(3):
        response = model.generate_content(
            f"Count to {i+1}",
            generation_config={'max_output_tokens': 50}
        )
        print(f"Request {i+1}: ✅")
except Exception as e:
    print(f"❌ Quota hit: {e}")
