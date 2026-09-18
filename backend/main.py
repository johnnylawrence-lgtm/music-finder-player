from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)


@app.get("/api/search")
def search():
    query = request.args.get("q", "").strip()

    if not query:
        return jsonify({"results": []})

    options = {
        "quiet": True,
        "extract_flat": True,
        "noplaylist": True,
    }

    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(
                f"ytsearch5:{query}",
                download=False
            )

        results = []

        for item in info.get("entries", [])[:5]:
            results.append({
                "title": item.get("title"),
                "artist": item.get("uploader"),
                "url": item.get("webpage_url") or item.get("url"),
                "thumbnail": item.get("thumbnail"),
                "duration": item.get("duration"),
            })

        return jsonify({"results": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/api/audio")
def audio():
    url = request.args.get("url")

    if not url:
        return jsonify({
            "error": "URL is required"
        }), 400

    options = {
        "format": "bestaudio/best",
        "quiet": True,
        "noplaylist": True,
    }

    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(url, download=False)

        return jsonify({
            "title": info.get("title"),
            "url": info.get("url"),
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
