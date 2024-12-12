FROM golang:1.22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache gcc musl-dev

WORKDIR /app
COPY . .
RUN go mod download

# Build with CGO enabled
RUN CGO_ENABLED=1 GOOS=linux go build -o server ./api/main.go

FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache docker-cli gcc musl-dev

WORKDIR /app
COPY --from=builder /app/server .

CMD ["./server"] 