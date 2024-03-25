# SocialFi-Agent

## Config env variables
```
DFX_NETWORK="local" or "mainnet"

# helloworld app
HELLOWORLD_CANISTER_ID="gb6fh-2yaaa-aaaal-ad6cq-cai"
HELLOWORLD_BOT_TOKEN="..."
HELLOWORLD_WEBHOOK_PATH="/"
HELLOWORLD_SECRET_TOKEN="..."

# re app
RE_CANISTER_ID=""
RE_BOT_TOKEN="..."
RE_WEBHOOK_PATH="/"
RE_SECRET_TOKEN="..."

```

## telegram <--> agent <--> reapp
| command   | command args      | call reapp | output       | agent -> reapp  |
| :-------- | :---------------- | :--------: | :----------- | --------------- |
| /start    | -                 | N          | some text    | - |
| /help     | -                 | N          | some text    | - |
| /listre   | -                 | Y          | [re list]?   | user_principal |
| /createre | symbol<br/>amount | Y          | reid?        | user_principal<br>symbol<br/>amount |
| /sendre   | reid              | Y          | success?     | user_principal<br>reid |
| /grabre   | reid              | Y          | amount?      | user_principal<br>reid |
| /revokere | reid              | Y          | success?     | user_principal<br>reid |
| /balance  | symbol[O]         | N          | [token list] | - |


## Deploy
- Using individual service accounts for your functions [Link](https://cloud.google.com/functions/docs/securing/function-identity#individual)
    - Cloud Run Invoker
    - Cloud SQL Client
    - Cloud SQL Editor
    - Secret Manager Secret Accessor
- Making a secret accessible to a function [Link](https://cloud.google.com/functions/docs/configuring/secrets#making_a_secret_accessible_to_a_function)

```
gcloud functions deploy helloworld \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=helloworld \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars DEBUG=telegraf:* \
  --set-env-vars DFX_NETWORK=mainet \
  --set-env-vars HELLOWORLD_CANISTER_ID=gb6fh-2yaaa-aaaal-ad6cq-cai \
  --set-env-vars HELLOWORLD_WEBHOOK_PATH=/ \
  --set-secrets HELLOWORLD_BOT_TOKEN=socialfi-agent-helloworld_bot_token:1 \
  --set-secrets HELLOWORLD_SECRET_TOKEN=socialfi-agent-helloworld_secret_token:1

```
