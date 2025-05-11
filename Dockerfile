FROM node:18-alpine


# Install Postgres
RUN apk update && apk add postgresql-client

# Working Directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the application port
EXPOSE 3306

# Start the application
CMD ["node", "dist/index.js"]
