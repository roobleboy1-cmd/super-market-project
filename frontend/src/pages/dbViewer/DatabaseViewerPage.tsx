import { useEffect, useState } from 'react';
import axios from 'axios';
import { dbViewerService } from '@/services/api/dbViewerService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';

interface CollectionInfo {
  name: string;
  count: number;
}

export default function DatabaseViewerPage() {
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(50);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDocJson, setNewDocJson] = useState('');
  const toast = useToast();

  const fetchCollections = async () => {
    try {
      const data = await dbViewerService.getCollections();
      setCollections(data.collections || []);
    } catch (e) {
      console.error('Failed to load collections', e);
    }
  };

  const fetchDocuments = async (name: string) => {
    setLoading(true);
    try {
      const data = await dbViewerService.getDocuments(name, limit);
      setDocuments(data.documents || []);
      setSelected(name);
    } catch (e) {
      console.error('Failed to load documents', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = async () => {
    try {
      const parsed = JSON.parse(newDocJson);
      await axios.post(`http://localhost:5000/api/v1/${selected}`, parsed);
      toast.success('Document added', `Added new document to ${selected}`);
      setShowAddModal(false);
      setNewDocJson('');
      fetchDocuments(selected);
    } catch (err: any) {
      toast.error('Failed to add document', err.message || String(err));
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">MongoDB Explorer (Frontend)</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Collections list */}
        <Card className="p-3 overflow-y-auto max-h-[600px]">
          <h3 className="font-semibold mb-2">Collections</h3>
          <ul className="space-y-1">
            {collections.map((col) => (
              <li key={col.name} className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800 text-xs">
                <span className="font-medium">{col.name}</span>
                <span className="text-xs text-gray-500 mr-2">{col.count}</span>
                <Button size="sm" onClick={() => fetchDocuments(col.name)}>
                  View
                </Button>
              </li>
            ))}
          </ul>
        </Card>

        {/* Documents view */}
        <Card className="col-span-2 p-3 overflow-auto max-h-[600px]">
          {selected ? (
            <>
              <div className="flex items-center mb-2 gap-2">
                <h3 className="font-semibold text-sm">{selected} ({documents.length} docs)</h3>
                <Input
                  type="number"
                  className="w-20 text-xs"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                />
                <Button size="sm" onClick={() => fetchDocuments(selected)}>
                  Reload
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddModal(true)}>
                  + Add Document
                </Button>
              </div>
              {loading ? (
                <p className="text-xs text-slate-500">Loading…</p>
              ) : (
                <pre className="text-xs whitespace-pre-wrap bg-gray-50 dark:bg-slate-900 p-3 rounded font-mono">
                  {JSON.stringify(documents, null, 2)}
                </pre>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-500">Select a collection on the left to view its documents.</p>
          )}
        </Card>
      </div>

      {/* Add Document Modal */}
      {showAddModal && (
        <Dialog open={showAddModal} onClose={() => setShowAddModal(false)} title={`Add document to ${selected}`}>
          <div className="space-y-3 text-xs">
            <p className="text-slate-500">Paste JSON payload below:</p>
            <textarea
              className="w-full h-48 p-2 border rounded font-mono text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              value={newDocJson}
              onChange={(e) => setNewDocJson(e.target.value)}
              placeholder='{ "name": "Example" }'
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleAddDocument}>Save to DB</Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
