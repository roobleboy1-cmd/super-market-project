import axios from 'axios';

// Service that talks to the local MongoDB explorer (port 8081)
// The explorer runs on the same machine, so we can call it directly.

export const dbViewerService = {
  async getCollections() {
    const res = await axios.get('http://localhost:8081/api/collections');
    return res.data; // { collections: [{ name, count }] }
  },
  async getDocuments(collection: string, limit = 50) {
    const res = await axios.get(`http://localhost:8081/api/collection/${encodeURIComponent(collection)}?limit=${limit}`);
    return res.data; // { documents: [...] }
  },
};
