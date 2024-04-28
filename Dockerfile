# phase 1
FROM node:20 AS builder

WORKDIR /app

COPY . .
# COPY package*.json ./

RUN npm install --production=false

RUN npm run build


# phase 2
FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000

CMD ["node", "dist/express.js"]
