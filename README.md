# Inner Child Clinic Web Application

This web application is designed to help users interact with a simulated "inner child" persona for therapeutic purposes.

## Features
-   Flask-based Python backend.
-   HTML/CSS/JavaScript frontend.
-   Input page for users to provide a photo (conceptually) and a trauma description.
-   Interaction page displaying:
    -   A (mocked) AI-generated child image.
    -   A dialogue system for chatting with the (mocked) AI child.
    -   A recovery gauge that updates based on (mocked) dialogue scores.
-   Secure API key and configuration management using `.env` files.

## Local Development Setup

Here's how to host this service locally for development:

1.  **Prerequisites:**
    *   Python 3.7+
    *   Pip (Python package installer)
    *   Git (for cloning, if you haven't already)

2.  **Clone the Repository (if applicable):**
    ```bash
    # git clone <repository_url>
    # cd <repository_name>
    ```

3.  **Create and Activate a Virtual Environment:**
    It's highly recommended to use a virtual environment to manage project dependencies.
    ```bash
    python -m venv venv
    ```
    Activate the environment:
    *   On Windows (Command Prompt/PowerShell):
        ```bash
        venv\Scripts\activate
        ```
    *   On macOS/Linux (bash/zsh):
        ```bash
        source venv/bin/activate
        ```
    You should see `(venv)` at the beginning of your terminal prompt.

4.  **Install Dependencies:**
    With your virtual environment activated, install the required packages:
    ```bash
    pip install -r requirements.txt
    ```

5.  **Set Up Environment Variables:**
    *   Copy the example environment file `.env.example` to a new file named `.env`:
        ```bash
        # On Windows (PowerShell or Command Prompt)
        # copy .env.example .env
        # On macOS/Linux
        cp .env.example .env
        ```
    *   Edit the `.env` file with your actual credentials or placeholders:
        *   `OPENAI_API_KEY`: For local development with mocked AI responses, you can leave the default placeholder value. If you have an OpenAI API key and want to test with real AI, paste your key here.
            ```
            OPENAI_API_KEY="YOUR_OPENAI_API_KEY_HERE_FALLBACK"
            ```
        *   `FLASK_SECRET_KEY`: This is used by Flask to secure sessions. Generate a strong secret key. You can use the following command in your terminal and paste the output:
            ```bash
            python -c "import os; print(os.urandom(24).hex())"
            ```
            Example entry in `.env`:
            ```
            FLASK_SECRET_KEY="your_generated_secret_key_here"
            ```

6.  **Run the Flask Development Server:**
    Ensure you are in the root directory of the project (where `requirements.txt` and the `app` folder are located).
    ```bash
    python app/main.py
    ```

7.  **Access the Application:**
    Open your web browser and navigate to the address shown in your terminal, which is typically:
    [http://127.0.0.1:5000/](http://127.0.0.1:5000/) or [http://localhost:5000/](http://localhost:5000/)

The application should now be running locally. The terminal where you executed `python app/main.py` will display server logs and any errors.

To stop the local server, return to the terminal and press `Ctrl+C`.

## Project Structure
-   `app/`: Contains the Flask application.
    -   `main.py`: The main Flask application file with routes and logic.
    -   `static/`: For static files (CSS, JavaScript, images).
        -   `style.css`: Main stylesheet.
    -   `templates/`: HTML templates.
        -   `index.html`: The input page.
        -   `interaction.html`: The page for interacting with the inner child.
-   `requirements.txt`: Python dependencies.
-   `.env.example`: Example file for environment variables.
-   `README.md`: This file.
-   `.gitignore`: Specifies intentionally untracked files that Git should ignore.

## Notes
- The AI components (image generation and dialogue) are currently mocked if a valid `OPENAI_API_KEY` is not provided in the `.env` file.
