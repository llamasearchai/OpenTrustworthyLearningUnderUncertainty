FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml /app/
RUN pnpm install --frozen-lockfile

COPY . /app

ARG VITE_API_BASE_URL
ARG VITE_WS_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_WS_BASE_URL=${VITE_WS_BASE_URL}

RUN pnpm build

EXPOSE 5173

CMD ["pnpm", "preview", "--host", "0.0.0.0", "--port", "5173"]

