# BigQuery Release Hub

A premium, modern web application that fetches, aggregates, and filters Google Cloud BigQuery Release Notes, allowing developers to easily track updates and share them on Twitter/X.

## 🚀 Features

-   **Granular Timeline**: Automatically parses the BigQuery Atom feed and splits daily logs into individual updates (Features, Issues, Deprecations, Announcements).
-   **Live Search & Filtering**: Filter updates by keyword or category badge in real-time.
-   **Mock Twitter Composer**: Compose and edit tweets with an interactive character counter, hashtag inclusion, and link attachment, before launching standard X Web Sharing.
-   **Copy-to-Clipboard**: Copy any update description instantly with built-in visual feedback.
-   **Visual Polish**: Sleek dark-mode theme featuring glassmorphism, responsive grid layout, custom scrollbar, and animated skeleton loading states.
-   **Robust Backend Caching**: Prevents rate-limiting by caching the feed for 5 minutes (with manual force-refresh support).

## 🛠️ Tech Stack

-   **Backend**: Python Flask, Requests, XML ElementTree
-   **Frontend**: Plain HTML5, Vanilla CSS3 (Custom variables, Keyframes), JavaScript (ES6)

## 📦 Getting Started

1.  **Clone or download the project files.**
2.  **Create and activate a virtual environment**:
    ```bash
    python -m venv venv
    # On Windows:
    .\venv\Scripts\activate
    # On macOS/Linux:
    source venv/bin/activate
    ```
3.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Run the application**:
    ```bash
    python app.py
    ```
5.  **Open the app**:
    Navigate to `http://127.0.0.1:5000/` in your browser.
