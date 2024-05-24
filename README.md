# SocialFi-Agent

## Deploy
- Using individual service accounts for your functions [Link](https://cloud.google.com/functions/docs/securing/function-identity#individual)
    - Cloud Run Invoker
    - Cloud SQL Client
    - Cloud SQL Editor
    - Secret Manager Secret Accessor
- Making a secret accessible to a function [Link](https://cloud.google.com/functions/docs/configuring/secrets#making_a_secret_accessible_to_a_function)

```

gcloud functions deploy RE00bot \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=rbot \
  --trigger-http \
  --min-instances 0 \
  --cpu 1 \
  --memory 2048MB \
  --concurrency 10 \
  --allow-unauthenticated \
  --set-env-vars DFX_NETWORK=mainet \
  --set-env-vars RBOT_TOKEN_SYMBOL=TEST•RICH \
  --set-env-vars RBOT_TOKEN_DECIMALS=2 \
  --set-env-vars RBOT_BOT_USERNAME=RE00bot \
  --set-env-vars RBOT_CANISTER_ID=pqtoi-6iaaa-aaaal-ad7rq-cai \
  --set-env-vars RBOT_WEBHOOK_PATH=/ \
  --set-secrets  RBOT_BOT_TOKEN=projects/398338012986/secrets/socialfi-agent-re00bot-bot-token:2 \
  --set-secrets  RBOT_SECRET_TOKEN=projects/398338012986/secrets/socialfi-agent-re00bot-secret-token:1 \
  --set-secrets  SOCIALFI_AGENT_MNEMONIC=projects/398338012986/secrets/socialfi-agent-mnemonic:1 \
  --set-secrets  SOCIALFI_AGENT_DERIVE_PATH=projects/398338012986/secrets/socialfi-agent-derive-path:1 \
  --set-secrets  SOCIALFI_AGENT_SECRET_KEY=projects/398338012986/secrets/socialfi-agent-secret-key:1 \
  --set-env-vars DB_INSTANCE_CONNECTION_NAME=octopus-dev-309403:asia-east1:octopus \
  --set-env-vars DB_NAME=socialfi-agent \
  --set-env-vars DB_USER=gateway \
  --set-secrets  DB_PASS=projects/398338012986/secrets/socialfi-agent-db-password:3 \
  --set-env-vars SWAP_CANISTER_ID=dvqk4-diaaa-aaaal-ajdfa-cai \
  --service-account socialfi-agent@octopus-dev-309403.iam.gserviceaccount.com

--set-env-vars DEBUG="telegraf:*" \
```

```
agent principal
w45ib-wppi2-gnn36-d2s7x-tnk77-gaksv-yn2xe-vludw-hzcav-tjezy-6ae
```

### sql
search `CREATE TABLE`


### tg
- icon
- describe
- cmd
```
start - Start RedEnvelope game
wallet - My wallet
list - List my RE
help - Show help commands
```

### GCP
```
https://console.cloud.google.com/security/secret-manager?hl=zh-cn&project=octopus-dev-309403
https://console.cloud.google.com/security/kms/keyrings?hl=zh-cn&project=octopus-dev-309403
```


## Hello World Template
```
# helloworld app
HELLOWORLD_CANISTER_ID="gb6fh-2yaaa-aaaal-ad6cq-cai"
HELLOWORLD_BOT_TOKEN="..."
HELLOWORLD_WEBHOOK_PATH="/"
HELLOWORLD_SECRET_TOKEN="..."
```

```
gcloud functions deploy helloworld \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=helloworld \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars DEBUG="telegraf:*" \
  --set-env-vars DFX_NETWORK=mainet \
  --set-env-vars HELLOWORLD_CANISTER_ID=gb6fh-2yaaa-aaaal-ad6cq-cai \
  --set-env-vars HELLOWORLD_WEBHOOK_PATH=/ \
  --set-secrets HELLOWORLD_BOT_TOKEN=socialfi-agent-helloworld-bot-token:1 \
  --set-secrets HELLOWORLD_SECRET_TOKEN=socialfi-agent-helloworld-secret-token:1

```

### 
```
测试token
https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=ugaqt-wqaaa-aaaar-qafgq-cai

测试whoami
gb6fh-2yaaa-aaaal-ad6cq-cai

红包
https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=pqtoi-6iaaa-aaaal-ad7rq-cai



```