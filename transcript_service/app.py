from flask import Flask, request, jsonify
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    CouldNotRetrieveTranscript
)

app = Flask(__name__)

@app.route("/api/transcript", methods=["POST"])
def get_transcript():
    data = request.get_json()
    video_id = data.get("videoId")
    lang = data.get("lang", "en")

    if not video_id:
        return jsonify({ "error": "Missing videoId" }), 400

    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang, 'en', 'en-US'])

        cleaned = [
            {
                "text": item["text"],
                "start": item["start"],
                "duration": item["duration"]
            }
            for item in transcript
        ]
        return jsonify({ "transcript": cleaned })

    except (TranscriptsDisabled, NoTranscriptFound):
        return jsonify({ "transcript": [], "error": "No transcript available" }), 404
    except VideoUnavailable:
        return jsonify({ "error": "Video is unavailable" }), 404
    except CouldNotRetrieveTranscript:
        return jsonify({ "error": "Transcript retrieval failed due to network or page error" }), 502
    except Exception as e:
        print("⚠️ Unexpected error:", e)
        return jsonify({ "error": f"Server error: {str(e)}" }), 500
