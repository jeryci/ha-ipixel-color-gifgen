FROM python:3.11-slim

# Create a non‑root user (recommended)
RUN addgroup --system app && adduser --system --ingroup app app
WORKDIR /app
USER app

# Copy the PixelForge source code (you will copy the contents of the
# ha‑ipixel‑color‑gifgen/tools/matrix-resizer directory into the image)
COPY . /app

# Install required Python packages
RUN pip install --no-cache-dir pypixelcolor bleak

# Expose the port the server listens on
EXPOSE 8085

# Run the server when the container starts
CMD ["python", "server.py"]
