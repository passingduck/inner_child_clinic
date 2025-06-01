from flask import Flask, render_template, request, redirect, url_for, jsonify, session
import openai
import os
import random
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file

app = Flask(__name__)

# Use environment variable for Flask secret key, with a fallback for development
app.secret_key = os.getenv("FLASK_SECRET_KEY", "default_dev_secret_key_for_flask")
if app.secret_key == "default_dev_secret_key_for_flask":
    print("Warning: FLASK_SECRET_KEY is using a default fallback. Set it in your .env file (e.g., by running: python -c 'import os; print(os.urandom(24).hex())' and adding it to .env).")

# Use environment variable for OpenAI API key
# The placeholder "YOUR_OPENAI_API_KEY_HERE_FALLBACK" is used to ensure the variable exists for mocking logic
# if it's not set in the environment.
OPENAI_API_KEY_FALLBACK = "YOUR_OPENAI_API_KEY_HERE_FALLBACK"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Set openai.api_key for the library if a real key is provided
if OPENAI_API_KEY and OPENAI_API_KEY != OPENAI_API_KEY_FALLBACK and "YOUR_OPENAI_API_KEY_HERE" not in OPENAI_API_KEY:
    print("OpenAI API key loaded from environment. Real API calls will be attempted if not overridden by mocking logic.")
    openai.api_key = OPENAI_API_KEY
    # Ensure the global OPENAI_API_KEY variable reflects the loaded key for any internal checks that might use it.
else:
    print("Warning: OPENAI_API_KEY is not set, is a common placeholder, or is the fallback value. Please set a valid key in your .env file. API calls will be mocked.")
    # If OPENAI_API_KEY was None (not set in .env), assign the fallback for consistent mocking.
    if not OPENAI_API_KEY:
        OPENAI_API_KEY = OPENAI_API_KEY_FALLBACK
    # Ensure openai.api_key is None if we are in a mocked state based on the key value
    openai.api_key = None


# Functions will now use the global OPENAI_API_KEY for their mocking decision,
# or the openai.api_key if they make direct calls.

def generate_child_image(current_api_key_value, trauma_description): # Parameter name changed for clarity
    print(f"Attempting to generate image with DALL-E for trauma: {trauma_description[:50]}...")
    # Mocking decision based on the value of the key passed or global state
    if not openai.api_key: # Check if the library key is not set (preferred check for "real" capability)
        print(f"Mocking generate_child_image: openai.api_key is not set. Using placeholder image.")
        return "https://via.placeholder.com/512/87CEEB/000000?text=Inner+Child+(Mocked)"

    # Actual DALL-E call would be here
    # try:
    #     response = openai.Image.create(
    #         prompt=f"A gentle and understanding 8-year-old child, photographic style. Theme: overcoming challenges related to '{trauma_description[:100]}'.",
    #         n=1,
    #         size="512x512"
    #     )
    #     image_url = response.data[0].url
    #     print(f"DALL-E image URL: {image_url}")
    #     return image_url
    # except Exception as e:
    #     print(f"Error generating image with DALL-E: {e}")
    #     return "https://via.placeholder.com/512.png?text=Error+Generating+Image"
    print("OpenAI API call for image generation is mocked (fallback due to placeholder key or explicit mock). Returning placeholder image.")
    return "https://via.placeholder.com/512/87CEEB/000000?text=Inner+Child+(Mocked)"


def get_child_response(current_api_key_value, user_message, trauma_situation, conversation_history=None): # Parameter name changed
    print(f"Attempting to get child's response. User: '{user_message}', Trauma: '{trauma_situation[:50]}'")

    if not openai.api_key: # Check if the library key is not set
        print(f"Mocking get_child_response: openai.api_key is not set. Using mock responses.")
        mock_responses = [
            {"response_text": "It sounds like you're going through a lot. I'm here.", "score": 1},
            {"response_text": "That's interesting. Tell me more.", "score": 0},
        ]
        return random.choice(mock_responses) if mock_responses else {"response_text": "I'm listening.", "score": 0}

    # ... (commented out actual LLM call structure) ...
    # try:
    #     # ...
    # except Exception as e:
    #     # ...
    #     return {"response_text": "I'm not sure what to say right now, can we try again?", "score": 0}

    print("OpenAI API call for chat is mocked (fallback due to placeholder key or explicit mock).")
    mock_responses = [
        {"response_text": "Oh wow, that sounds really hard. I'm sorry you went through that.", "score": 1},
        {"response_text": "It's okay to feel sad sometimes. Do you want a hug?", "score": 1},
        {"response_text": "Hmm, I don't understand that. Can you tell me more?", "score": 0},
        {"response_text": "Why would you say that? That's not very nice.", "score": -1},
        {"response_text": "You're very brave for talking about this.", "score": 1},
        {"response_text": "I like talking to you. It makes me feel happy!", "score": 1}
    ]
    return random.choice(mock_responses) if mock_responses else {"response_text": "I'm a bit quiet right now.", "score": 0}


@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        photo = request.files.get('photo')
        trauma_text = request.form.get('trauma')

        if photo and trauma_text:
            session['trauma_text'] = trauma_text
            print(f"Received photo: {photo.filename}, Trauma: {trauma_text}. Trauma text stored in session.")
            # Pass the global OPENAI_API_KEY value to the function, though it might also rely on openai.api_key directly
            generated_image_url = generate_child_image(OPENAI_API_KEY, trauma_text)
            return redirect(url_for('start_interaction', image_url=generated_image_url))
        else:
            print("Missing photo or trauma text")
            return render_template('index.html', error="Please upload a photo and describe your trauma.")

    return render_template('index.html')

@app.route('/start_interaction')
def start_interaction():
    image_url = request.args.get('image_url', 'https://via.placeholder.com/512?text=Default+Image')

    initial_greeting_data = {
        "response_text": "Hello! It's nice to meet you. What would you like to talk about?",
        "score": 0
    }
    # If we wanted the LLM to generate the greeting, we'd call get_child_response here
    # trauma_situation = session.get('trauma_text', "about their feelings")
    # initial_greeting_data = get_child_response(OPENAI_API_KEY, "System: Initial Greeting", trauma_situation)


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
        return jsonify({"error": "No message provided"}), 400

    child_response_data = get_child_response(OPENAI_API_KEY, user_message, trauma_situation)
    return jsonify(child_response_data)

if __name__ == '__main__':
    app.run(debug=True)
