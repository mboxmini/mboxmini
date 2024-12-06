FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Run formatting and linting
RUN npm run format
RUN npm run lint:fix

# Expose port 3000
EXPOSE 3000

# Start in development mode
CMD ["npm", "start"] 