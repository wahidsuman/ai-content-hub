// Simple test worker
export default {
  async fetch(request) {
    return new Response("AgamiNews Control Centre v1.0.3 - Test Deploy", {
      headers: { "content-type": "text/plain" }
    });
  }
};