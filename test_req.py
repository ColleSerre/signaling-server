import requests
import json


response = requests.post(
    url="http://localhost:3000/api/ai_approval",
    params={
        "topic": "Fun cats !"
    }
)

print(
    response.json()["message"]["content"]
)
