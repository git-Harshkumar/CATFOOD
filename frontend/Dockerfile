FROM node:22-alpine

WORKDIR /app

# Install dependencies cleanly respecting package-lock.json
COPY package*.json ./
RUN npm ci

# Copy frontend source code
COPY . .

# Set non-root user permissions
RUN chown -R node:node /app
USER node

# Expose Vite dev server port
EXPOSE 5173

# Start Vite dev server binding to 0.0.0.0
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
