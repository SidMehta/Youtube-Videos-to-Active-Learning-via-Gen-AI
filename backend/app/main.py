import logging
import os
import json
import re
import random
import functools
import time
from concurrent.futures import ThreadPoolExecutor

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.cloud import texttospeech

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create a thread pool executor for concurrent processing
executor = ThreadPoolExecutor(max_workers=3)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

def init_google_client():
    """Initialize Google Gemini"""
    logger.info("Initializing Google Gemini client...")
    return genai.Client(
        vertexai=True,
        project=os.getenv('GOOGLE_CLOUD_PROJECT'),
        location="us-central1",
    )

def with_error_handling(f):
    @functools.wraps(f)
    def wrapped(*args, **kwargs):
        try:
            logger.debug(f"Entering function: {f.__name__}, args: {args}, kwargs: {kwargs}")
            result = f(*args, **kwargs)
            logger.debug(f"Exiting function: {f.__name__} successfully")
            return result
        except Exception as e:
            logger.exception(f"Error in {f.__name__}: {str(e)}")
            return jsonify({
                'error': str(e),
                'status': 'error',
                'timestamp': time.time()
            }), 500
    return wrapped

def randomize_answers(segment):
    """Randomize the position of answers while tracking the correct answer"""
    answers = segment['answers']
    correct_answer = answers[0]  # Original correct answer

    # Create answer pairs to maintain the connection between answers and their correctness
    answer_pairs = [(ans, ans == correct_answer) for ans in answers]
    random.shuffle(answer_pairs)

    # Update the segment with randomized answers and set the correct index
    segment['answers'] = [pair[0] for pair in answer_pairs]
    segment['correct_index'] = [i for i, pair in enumerate(answer_pairs) if pair[1]][0]

    logger.debug(f"Randomized answers: {segment['answers']} with correct index {segment['correct_index']}")
    return segment

def analyze_video_content(url, language='english'):
    """Analyze video content using Gemini"""
    logger.info(f"Starting analysis for URL: {url} with language: {language}")
    try:
        client = init_google_client()
        logger.info("Gemini client initialized successfully.")

        video_part = types.Part.from_uri(
            file_uri=url,
            mime_type="video/*",
        )

        # Updated prompt to include bilingual explanations - children under 12 years old.
        text_part = types.Part.from_text(text=f"""
Analyze this educational video for young middle school students.
Create interactive questions following these rules:

1. Video Content Understanding:
    - Watch enough content (about 1-2 minutes) to cover a complete concept
    - Let video play until a natural break point after concept explanation
    - Create question about the content that was just covered. Please make sure that the content that is already covered is asked in the question and not the upcoming content. Please, this is very important. The question should be about the content before the breakpoint, not after.
    - Questions should test understanding, not just memory
    - Questions should be in the primary language of the content. Please be extremely careful about this part. Mostly you would see english content. Only switch language if you observe the audio or text is mostly in the language other than english. 
    - Questions should be engaging and age-appropriate
    - Include clear, simple explanations for wrong answers
    - Incorrect answers should be close to the correct answer, so as to make the education experience good. The incorrect answers should be serious and not funny random stuff. As we are an educational platform. Make the incorrect answers very very plausible.

2. Timing Rules:
    - First question should come after 1-2 minutes of content
    - Note the timestamp when to STOP the video (after concept is fully explained)
    - Questions should appear at natural break points. The question should be about the content before the breakpoint, not after.
    - Each new question should be about content covered since the previous question

3. Question Format:
    - Simple, clear questions suitable for young middle school students.
    - Four answer choices (one correct, three plausible but incorrect). Make the incorrect answers very very plausible. As we are a serious education platform.
    - Encouraging message for correct answers
    - Educational explanation for incorrect attempts
    - Use encouraging language. You can also be a bit playful, but make sure your language is suited for children upto 12 years of age.

4. Detailed Explanations:
    - For each question, provide a detailed explanation in both English and {language} (if not English)
    - Make explanations thorough and educational
    - Include step-by-step breakdowns when concepts are complex
    - Use age-appropriate language in both languages
    - If translation to {language} isn't possible, indicate "Translation not available"

5. Number of Questions:
  - Check the length of the video.
  - Minimum two questions if video length > 240 seconds
  - Minimum three questions if video length > 500 seconds
  - Minimum four questions if video length > 900 seconds
  - Minimum five questions if video length > 1500 seconds
  - Maximum 10 questions per video

Format response as JSON [Take a note that I will be putting the json data into the app frontend. So avoid putting any phrases that may not make sense for that.]:
{{
    "segments": [
        {{
            "timestamp": "MM:SS",
            "content_covered": "Brief summary of what was explained",
            "question": "Question about the content just covered. Greet the kid first and get their attention before asking the question. In a fun way.",
            "answers": ["correct", "incorrect1", "incorrect2", "incorrect3"],
            "praise": "Great job! [Include specific praise about why this answer is correct]",
            "explanation": "Let's understand this better: [Brief child-friendly explanation]",
            "detailed_explanation": {{
                "english": "Thorough step-by-step explanation of the concept in English. Also explain maybe some related concepts used in the explanation. Be very detailed.",
                "translated": "Same detailed explanation in {language} if applicable"
            }}
        }}
    ]
}}
""")

        # Rest of your existing function code...
        contents = [types.Content(role="user", parts=[video_part, text_part])]

        generate_config = types.GenerateContentConfig(
            temperature=0.7,
            top_p=0.95,
            max_output_tokens=8192,
            stop_sequences=[],
            safety_settings=[
                types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_LOW_AND_ABOVE"),
                types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_LOW_AND_ABOVE"),
                types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_LOW_AND_ABOVE"),
                types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_LOW_AND_ABOVE")
            ],
        )

        logger.info("Calling Gemini API...")
        response = client.models.generate_content(
            model="gemini-2.0-flash-001",
            contents=contents,
            config=generate_config,
        )
        logger.info("Gemini API call completed.")

        if not response or not response.text:
            logger.error("Gemini API response is empty or None.")
            return {'error': 'Failed to get response from Gemini API'}

        try:
            response_text = response.text
            logger.debug(f"Raw response text from Gemini: {response_text}")
            # Manual JSON extraction logic as in your previous working code:
            start_idx = response_text.find('{"segments":')
            if start_idx == -1:
                start_idx = response_text.find('{')
            if start_idx != -1:
                response_text = response_text[start_idx:]
                brace_count = 0
                for i, char in enumerate(response_text):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            response_text = response_text[:i+1]
                            break
            response_text = response_text.strip()
            logger.debug(f"Extracted JSON text: {response_text}")
            json_data = json.loads(response_text)
            logger.info("JSON parsing successful.")

            if "segments" not in json_data or not json_data["segments"]:
                logger.error("Response missing 'segments' or segments are empty.")
                return {'error': 'Response missing required segments'}

            for segment in json_data["segments"]:
                required_fields = [
                    "timestamp", "question", "answers", "praise", 
                    "explanation", "detailed_explanation"
                ]
                for field in required_fields:
                    if field not in segment:
                        logger.error(f"Segment missing required field: {field}")
                        return {'error': f'Segment missing required field: {field}'}
                
                # Validate detailed_explanation structure
                if "detailed_explanation" in segment:
                    if "english" not in segment["detailed_explanation"]:
                        segment["detailed_explanation"]["english"] = "Detailed explanation not available"
                    if "translated" not in segment["detailed_explanation"]:
                        segment["detailed_explanation"]["translated"] = "Translation not available"
                else:
                    segment["detailed_explanation"] = {
                        "english": "Detailed explanation not available",
                        "translated": "Translation not available"
                    }

                if len(segment["answers"]) != 4:
                    logger.error("Segment does not have exactly 4 answers.")
                    return {'error': 'Each segment must have exactly 4 answers'}

            for segment in json_data["segments"]:
                segment = randomize_answers(segment)

            logger.info("Video analysis and validation complete successfully.")
            return json_data

        except json.JSONDecodeError as e:
            logger.exception(f"JSON parsing error: {str(e)}. Response text: {response_text}")
            return {'error': 'Failed to parse response as JSON'}
        except Exception as e:
            logger.exception(f"Error processing response after Gemini API call: {str(e)}")
            return {'error': str(e)}

    except Exception as e:
        logger.exception(f"Error during video analysis setup/Gemini client init: {str(e)}")
        return {'error': str(e)}
    finally:
        logger.info(f"Finished processing for URL: {url}")



@app.route('/api/speak', methods=['POST'])
@with_error_handling
def text_to_speech():
    """Handle text-to-speech requests"""
    data = request.get_json()
    text = data.get('text', '')

    if not text:
        logger.error("No text provided for text-to-speech.")
        return jsonify({'error': 'No text provided'}), 400

    client = texttospeech.TextToSpeechClient()
    synthesis_input = texttospeech.SynthesisInput(text=text)

    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        name="en-US-Journey-F",
        ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
    )

    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )

    logger.info("Calling Text-to-Speech API...")
    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config
    )
    logger.info("Text-to-Speech API call completed.")

    return Response(
        response.audio_content,
        mimetype="audio/mp3"
    )

# Update the analyze_video endpoint to handle language parameter
@app.route('/api/analyze', methods=['POST'])
@with_error_handling
def analyze_video():
    """Handle video analysis request"""
    logger.info("Entry point of /api/analyze endpoint")
    data = request.get_json()
    videos = data.get('videos', [])
    language = data.get('language', 'english')  # Default to English if not specified
    
    logger.debug(f"Received video URLs: {videos} with language: {language}")

    if not videos:
        logger.error("No videos provided in request.")
        return jsonify({'error': 'No videos provided'}), 400

    # Process videos with language parameter
    analysis_results = []
    for video in videos:
        result = analyze_video_content(video, language)
        if 'error' in result:
            logger.error(f"Error in analysis for video {video}: {result['error']}")
            return jsonify({
                'error': f"Error analyzing video {video}: {result['error']}"
            }), 500
        analysis_results.append(result)

    logger.info("All video analyses successful. Returning results.")
    return jsonify({
        'status': 'success',
        'results': analysis_results,
        'language': language
    })

@app.route('/api/generate-report', methods=['POST'])
@with_error_handling
def generate_report():
    """Generate learning performance report using Gemini"""
    data = request.get_json()
    learning_history = data.get('learningHistory', [])
    user_name = data.get('userName', '')

    if not learning_history:
        logger.error("No learning history provided for report generation.")
        return jsonify({'error': 'No learning history provided'}), 400

    client = init_google_client()

    prompt = f"""
Analyze this learning history for {user_name} who is under 7 years old.
Create a parent-friendly report focusing on:

1. Strengths (3-4 points):
- Identify concepts where {user_name} showed strong understanding
- Look for patterns of correct answers
- Highlight quick learning and good comprehension

2. Areas for Improvement (2-3 points):
- Identify concepts that need more practice
- Look for patterns in incorrect answers
- Frame feedback positively and constructively

3. Recommendations for Parents (3-4 points):
- Suggest specific activities to reinforce learning
- Include both structured and play-based learning ideas
- Provide tips for supporting {user_name}'s learning style

Format as JSON:
{{
    "strengths": ["point1", "point2", "point3"],
    "improvements": ["point1", "point2"],
    "recommendations": ["rec1", "rec2", "rec3"]
}}

Learning history: {json.dumps(learning_history)}
"""

    contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt)])]

    generate_config = types.GenerateContentConfig(
        temperature=0.7,
        top_p=0.8,
        max_output_tokens=2048,
        stop_sequences=[],
    )

    logger.info("Calling Gemini API for report generation...")
    # Using the working flash model for report generation as well
    response = client.models.generate_content(
        model="gemini-2.0-flash-001",
        contents=contents,
        config=generate_config,
    )
    logger.info("Gemini API call for report generation completed.")

    if not response or not response.text:
        logger.error("Failed to generate report; empty response from Gemini API.")
        return jsonify({'error': 'Failed to generate report'}), 500

    try:
        response_text = response.text
        logger.debug(f"Raw response text from Gemini: {response_text}")
        # Manual JSON extraction logic as in your previous working code:
        start_idx = response_text.find('{"segments":')
        if start_idx == -1:
            start_idx = response_text.find('{')
        if start_idx != -1:
            response_text = response_text[start_idx:]
            brace_count = 0
            for i, char in enumerate(response_text):
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        response_text = response_text[:i+1]
                        break
        response_text = response_text.strip()
        logger.debug(f"Extracted JSON text: {response_text}")
        json_data = json.loads(response_text)
        logger.info("JSON parsing successful.")

        logger.info("Report response complete successfully.")
        report_data = json_data

    except json.JSONDecodeError as e:
        logger.exception(f"JSON parsing error: {str(e)}. Response text: {response_text}")
        return {'error': 'Failed to parse response as JSON'}
    except Exception as e:
        logger.exception(f"Error processing response after Gemini API call: {str(e)}")
        return {'error': str(e)}




    try:
        # report_data = json.loads(response.text)
        required_fields = ['strengths', 'improvements', 'recommendations']

        for field in required_fields:
            if field not in report_data:
                logger.error(f"Report missing required field: {field}")
                raise ValueError(f'Missing required field: {field}')
            if not isinstance(report_data[field], list):
                logger.error(f"Field {field} must be a list")
                raise ValueError(f'Field {field} must be a list')

        logger.info("Report generation successful.")
        return jsonify({
            'status': 'success',
            'data': report_data
        })

    except json.JSONDecodeError:
        logger.exception("Invalid report format; JSON decoding failed.")
        return jsonify({'error': 'Invalid report format'}), 500
    except ValueError as e:
        logger.exception(f"Report validation error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
