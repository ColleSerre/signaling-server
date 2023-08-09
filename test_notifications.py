import requests

requests.post("http://localhost:3000/api/send_push", params={
    "token": "ExponentPushToken[1cEHMLPKZKxJcSPtT7-K6R]",
})

print(requests)
