from flask import Flask, render_template, request, redirect, url_for, jsonify, session
import openai
import os
import random
import re # Added for parsing score from LLM response
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

app.secret_key = os.getenv("FLASK_SECRET_KEY", "default_dev_secret_key_for_flask")
if app.secret_key == "default_dev_secret_key_for_flask":
    print("Warning: FLASK_SECRET_KEY is using a default fallback. Set it in your .env file.")

OPENAI_API_KEY_FALLBACK = "YOUR_OPENAI_API_KEY_HERE_FALLBACK"
OPENAI_API_KEY_ENV = os.getenv("OPENAI_API_KEY")

if OPENAI_API_KEY_ENV and OPENAI_API_KEY_ENV != OPENAI_API_KEY_FALLBACK and "YOUR_OPENAI_API_KEY_HERE" not in OPENAI_API_KEY_ENV:
    print("OpenAI API key loaded from environment. Real API calls will be attempted.")
    openai.api_key = OPENAI_API_KEY_ENV
else:
    print("Warning: OPENAI_API_KEY is not set, is a common placeholder, or is the fallback value. API calls will be mocked.")
    openai.api_key = None


def generate_child_image(trauma_description):
    print(f"Generating image based on trauma: {trauma_description[:50]}...")
    if openai.api_key:
        try:
            dalle_prompt = (
                "A gentle, hopeful, and understanding 8-year-old child, detailed photographic style, "
                "looking directly at the camera with a slight smile. Soft, warm lighting. "
                "Minimalist, slightly blurred background. The child's expression should convey safety and empathy."
            )
            response = openai.Image.create(
                prompt=dalle_prompt,
                n=1,
                size="512x512",
                response_format="url"
            )
            image_url = response.data[0].url
            print(f"DALL-E image generated successfully: {image_url}")
            return image_url
        except Exception as e:
            print(f"DALL-E API error: {e}")
            print("Falling back to local static placeholder image.")
            return url_for('static', filename='images/placeholder.png')
    else:
        print("Mocking generate_child_image: openai.api_key is not set. Using local static placeholder.")
        return url_for('static', filename='images/placeholder.png')


def get_child_response(user_message, trauma_situation, conversation_history=None):
    print(f"Getting child response for: '{user_message}', Trauma: '{trauma_situation[:50]}'")

    if openai.api_key:
        try:
            system_prompt_template = (
                "당신은 친절하고, 공감 능력이 뛰어나며, 이해심 많은 8살 아이입니다. "
                "사용자는 내면의 아이를 치유하기 위해 당신과 상호작용하는 어른입니다. "
                "사용자의 과거 트라우마는 '{trauma_situation}'와(과) 관련이 있습니다. "
                "아이의 시선으로 사용자의 메시지에 답해주세요. 위로나 간단한 통찰, 또는 순수한 질문을 할 수 있습니다. "
                "답변은 비교적 짧게, 한두 문장으로 유지해주세요. "
                "답변 후, 다음 줄에 현재 상호작용의 치유 기여도를 점수로 매겨주세요: "
                "-1 (치유에 도움이 안 되거나 부정적), 0 (중립), 1 (치유에 도움이 되거나 긍정적). "
                "점수는 반드시 '점수: X' 형식으로 제공해주세요. (예: 점수: 1)."
            )
            safe_trauma_situation = trauma_situation if trauma_situation and trauma_situation.strip() else "특별히 언급되지 않은 과거의 어려움"
            formatted_system_prompt = system_prompt_template.format(trauma_situation=safe_trauma_situation)

            messages = [
                {"role": "system", "content": formatted_system_prompt},
                {"role": "user", "content": user_message}
            ]
            # if conversation_history: # For future context window management
            #     messages = [{"role": "system", "content": formatted_system_prompt}] + conversation_history + [{"role": "user", "content": user_message}]


            completion = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=0.7,
                max_tokens=150
            )

            content = completion.choices[0].message.content.strip()

            response_text = content
            score = 0

            match = re.search(r"(?:점수|Score)\s*:\s*(-?\d+)", content, re.IGNORECASE)
            if match:
                try:
                    score = int(match.group(1))
                    response_text = content[:match.start()].strip()
                    print(f"GPT response parsed. Dialogue: '{response_text}', Score: {score}")
                except ValueError:
                    print(f"Could not parse score from LLM response part: '{match.group(1)}'. Using default score 0.")
            else:
                print(f"Score line not found in LLM response: '{content}'. Using default score 0.")

            return {"response_text": response_text, "score": score}

        except Exception as e:
            print(f"GPT API error: {e}")
            return {"response_text": "지금은 답변하기 조금 어려워요. 다시 시도해 주시겠어요?", "score": 0}
    else:
        print("Mocking get_child_response: openai.api_key is not set. Using Korean mock responses.")
        mock_responses = [
            {"response_text": "정말 힘든 시간을 보내셨군요. 마음이 아파요.", "score": 1},
            {"response_text": "가끔 슬퍼도 괜찮아요. 안아줄까요?", "score": 1},
            {"response_text": "음, 잘 모르겠어요. 좀 더 자세히 말해줄래요?", "score": 0},
            {"response_text": "왜 그렇게 말해요? 그건 별로 좋지 않아요.", "score": -1},
            {"response_text": "이런 이야기를 하다니 정말 용감하네요.", "score": 1},
            {"response_text": "너랑 이야기하는 거 정말 좋아. 나도 기분이 좋아져!", "score": 1}
        ]
        return random.choice(mock_responses)


@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        photo = request.files.get('photo')
        trauma_text = request.form.get('trauma')

        if photo and trauma_text:
            session['trauma_text'] = trauma_text
            generated_image_url = generate_child_image(trauma_text)
            return redirect(url_for('start_interaction', image_url=generated_image_url))
        else:
            return render_template('index.html', error="사진을 업로드하고 트라우마 상황을 설명해주세요.")

    return render_template('index.html')

@app.route('/start_interaction')
def start_interaction():
    default_image_url = url_for('static', filename='images/placeholder.png')
    image_url = request.args.get('image_url', default_image_url)

    initial_greeting_data = {
        "response_text": "안녕하세요! 만나서 반가워요. 어떤 이야기를 나누고 싶으신가요?",
        "score": 0
    }

    return render_template(
        'interaction.html',
        image_url=image_url,
        initial_greeting=initial_greeting_data["response_text"],
        initial_greeting_score=initial_greeting_data["score"]
    )

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message')
    trauma_situation = session.get('trauma_text', "a difficult past experience")

    if not user_message:
        return jsonify({"error": "메시지가 제공되지 않았습니다"}), 400

    child_response_data = get_child_response(user_message, trauma_situation)
    return jsonify(child_response_data)

if __name__ == '__main__':
    app.run(debug=True)
