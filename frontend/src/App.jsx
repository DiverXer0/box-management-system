import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import QRCode from 'qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Fuse from 'fuse.js';
import './App.css';

// Configure axios
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
axios.defaults.baseURL = API_BASE_URL;

// Utility functions
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const downloadCSV = (data, filename) => {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const convertToCSV = (data) => {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',') 
        ? `"${value}"` 
        : value;
    }).join(',')
  );
  return [csvHeaders, ...csvRows].join('\n');
};

// Components
const BoxList = () => {
  const [boxes, setBoxes] = useState([]);
  const [filteredBoxes, setFilteredBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoxes();
  }, [sortBy, sortOrder]);

  useEffect(() => {
    filterBoxes();
  }, [boxes, searchTerm, locationFilter]);

  const fetchBoxes = async () => {
    try {
      const response = await axios.get('/boxes', {
        params: { sort_by: sortBy, sort_order: sortOrder }
      });
      setBoxes(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching boxes:', error);
      setLoading(false);
    }
  };

  const filterBoxes = () => {
    let filtered = boxes;

    if (searchTerm) {
      const fuse = new Fuse(filtered, {
        keys: ['name', 'location', 'description'],
        threshold: 0.4,
        minMatchCharLength: 1
      });
      filtered = fuse.search(searchTerm).map(result => result.item);
    }

    if (locationFilter) {
      filtered = filtered.filter(box => 
        box.location?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    setFilteredBoxes(filtered);
  };

  const handleCreateBox = async (boxData) => {
    try {
      await axios.post('/boxes', boxData);
      fetchBoxes();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating box:', error);
    }
  };

  const handleDeleteBox = async (boxId) => {
    if (window.confirm('Are you sure? This will delete the box and all its items.')) {
      try {
        await axios.delete(`/boxes/${boxId}`);
        fetchBoxes();
      } catch (error) {
        console.error('Error deleting box:', error);
      }
    }
  };

  const exportBoxesToCSV = () => {
    const exportData = boxes.map(box => ({
      ID: box.id,
      Name: box.name,
      Location: box.location || '',
      Description: box.description || '',
      'Item Count': box.item_count,
      'Created At': formatDate(box.created_at)
    }));
    downloadCSV(exportData, 'boxes_export.csv');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="spinner"></div>
    </div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Box Management System</h1>
        
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="Search boxes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Filter by location..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="created_at">Sort by Date</option>
            <option value="item_count">Sort by Items</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Create New Box
          </button>
          <button
            onClick={exportBoxesToCSV}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            Export to CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBoxes.map(box => (
          <div key={box.id} className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
               onClick={() => navigate(`/box/${box.id}`)}>
            <h3 className="text-xl font-semibold mb-2">{box.name}</h3>
            <p className="text-gray-600 mb-1">📍 {box.location || 'No location'}</p>
            <p className="text-gray-600 mb-2">📦 {box.item_count} items</p>
            <p className="text-sm text-gray-500">{box.description || 'No description'}</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Show QR modal
                }}
                className="text-blue-500 hover:text-blue-600"
              >
                QR Code
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteBox(box.id);
                }}
                className="text-red-500 hover:text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <CreateBoxModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateBox} />
      )}
    </div>
  );
};

const BoxDetail = () => {
  const { boxId } = useParams();
  const [box, setBox] = useState(null);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoxDetails();
  }, [boxId]);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm]);

  const fetchBoxDetails = async () => {
    try {
      const [boxResponse, itemsResponse] = await Promise.all([
        axios.get(`/boxes/${boxId}`),
        axios.get(`/boxes/${boxId}/items`)
      ]);
      setBox(boxResponse.data);
      setItems(itemsResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching box details:', error);
      setLoading(false);
    }
  };

  const filterItems = () => {
    if (!searchTerm) {
      setFilteredItems(items);
      return;
    }

    const fuse = new Fuse(items, {
      keys: ['name', 'details'],
      threshold: 0.4,
      minMatchCharLength: 1
    });
    setFilteredItems(fuse.search(searchTerm).map(result => result.item));
  };

  const handleAddItem = async (itemData) => {
    try {
      await axios.post('/items', { ...itemData, box_id: boxId });
      fetchBoxDetails();
      setShowAddItemModal(false);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleUpdateItem = async (itemId, updateData) => {
    try {
      await axios.put(`/items/${itemId}`, updateData);
      fetchBoxDetails();
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await axios.delete(`/items/${itemId}`);
        fetchBoxDetails();
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text(box.name, 14, 22);
    doc.setFontSize(12);
    doc.text(`Location: ${box.location || 'N/A'}`, 14, 32);
    doc.text(`Total Items: ${items.length}`, 14, 40);
    
    // Table
    const tableData = items.map(item => [
      item.name,
      item.quantity.toString(),
      item.details || '',
      formatDate(item.created_at)
    ]);
    
    doc.autoTable({
      head: [['Item Name', 'Quantity', 'Details', 'Added Date']],
      body: tableData,
      startY: 50,
      styles: { cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });
    
    doc.save(`${box.name}_items.pdf`);
  };

  const exportToCSV = () => {
    const exportData = items.map(item => ({
      'Item Name': item.name,
      'Quantity': item.quantity,
      'Details': item.details || '',
      'Added Date': formatDate(item.created_at)
    }));
    downloadCSV(exportData, `${box.name}_items.csv`);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="spinner"></div>
    </div>;
  }

  if (!box) {
    return <div className="container mx-auto p-4">
      <h1 className="text-2xl">Box not found</h1>
      <button onClick={() => navigate('/')} className="mt-4 text-blue-500 hover:text-blue-600">
        Back to boxes
      </button>
    </div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <button onClick={() => navigate('/')} className="text-blue-500 hover:text-blue-600 mb-4">
          ← Back to boxes
        </button>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold">{box.name}</h1>
              <p className="text-gray-600 mt-2">📍 {box.location || 'No location'}</p>
              <p className="text-gray-600">{box.description || 'No description'}</p>
            </div>
            <button
              onClick={() => setShowQRModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Show QR Code
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddItemModal(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              Add Item
            </button>
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
            >
              Export PDF
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
            >
              Export CSV
            </button>
          </div>
        </div>

        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Added Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingItem === item.id ? (
                    <input
                      type="text"
                      defaultValue={item.name}
                      className="px-2 py-1 border rounded"
                      id={`name-${item.id}`}
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingItem === item.id ? (
                    <input
                      type="number"
                      defaultValue={item.quantity}
                      className="px-2 py-1 border rounded w-20"
                      id={`quantity-${item.id}`}
                    />
                  ) : (
                    <div className="text-sm text-gray-900">{item.quantity}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingItem === item.id ? (
                    <input
                      type="text"
                      defaultValue={item.details}
                      className="px-2 py-1 border rounded w-full"
                      id={`details-${item.id}`}
                    />
                  ) : (
                    <div className="text-sm text-gray-500">{item.details || '-'}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(item.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {editingItem === item.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const name = document.getElementById(`name-${item.id}`).value;
                          const quantity = parseInt(document.getElementById(`quantity-${item.id}`).value);
                          const details = document.getElementById(`details-${item.id}`).value;
                          handleUpdateItem(item.id, { name, quantity, details });
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingItem(null)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingItem(item.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddItemModal && (
        <AddItemModal onClose={() => setShowAddItemModal(false)} onAdd={handleAddItem} />
      )}

      {showQRModal && (
        <QRCodeModal box={box} onClose={() => setShowQRModal(false)} />
      )}
    </div>
  );
};

// Modal Components
const CreateBoxModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onCreate(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Create New Box</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Box Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Create Box
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddItemModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    details: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onAdd(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Add New Item</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Item Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Details</label>
            <textarea
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const QRCodeModal = ({ box, onClose }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    generateQRCode();
  }, [box]);

  const generateQRCode = async () => {
    const url = `${window.location.origin}/box/${box.id}`;
    try {
      const qrCode = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrCode);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const downloadQRCode = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(24);
    doc.text(box.name, 105, 30, { align: 'center' });
    
    // QR Code
    if (qrCodeUrl) {
      doc.addImage(qrCodeUrl, 'PNG', 55, 50, 100, 100);
    }
    
    // Box details
    doc.setFontSize(14);
    doc.text(`Location: ${box.location || 'N/A'}`, 105, 170, { align: 'center' });
    doc.text(box.description || '', 105, 180, { align: 'center' });
    
    // Box ID
    doc.setFontSize(10);
    doc.text(`Box ID: ${box.id}`, 105, 200, { align: 'center' });
    
    doc.save(`${box.name}_QR.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">{box.name}</h2>
        
        <div className="flex flex-col items-center">
          {qrCodeUrl && (
            <img src={qrCodeUrl} alt="QR Code" className="mb-4" />
          )}
          
          <p className="text-gray-600 mb-2">📍 {box.location || 'No location'}</p>
          <p className="text-sm text-gray-500 mb-4">{box.description || 'No description'}</p>
          <p className="text-xs text-gray-400 mb-4">ID: {box.id}</p>
        </div>
        
        <div className="flex gap-2 justify-center">
          <button
            onClick={downloadQRCode}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Download PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const QRScanner = ({ onClose }) => {
  const [scanning, setScanning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 }
    });

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      scanner.clear();
    };
  }, []);

  const onScanSuccess = (decodedText) => {
    // Check if it's a full URL or just a box ID
    if (decodedText.includes('/box/')) {
      const boxId = decodedText.split('/box/')[1];
      navigate(`/box/${boxId}`);
    } else if (decodedText.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // UUID format - assume it's a box ID
      navigate(`/box/${decodedText}`);
    }
    onClose();
  };

  const onScanFailure = (error) => {
    // Handle scan failure silently
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
        <h2 className="text-2xl font-bold mb-4">Scan QR Code</h2>
        
        <div id="qr-reader" className="mb-4"></div>
        
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const GlobalSearch = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.get('/search', {
        params: { q: searchTerm }
      });
      setResults(response.data);
    } catch (error) {
      console.error('Error searching:', error);
    }
    setLoading(false);
  };

  const highlightMatch = (text, search) => {
    if (!search) return text;
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === search.toLowerCase() ? 
        <mark key={index} className="bg-yellow-300">{part}</mark> : part
    );
  };

  const handleResultClick = (result) => {
    if (result.type === 'box') {
      navigate(`/box/${result.id}`);
    } else {
      navigate(`/box/${result.box_id}`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <h2 className="text-2xl font-bold mb-4">Global Search</h2>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search across all boxes and items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Search
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4">Searching...</div>
          ) : (
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  onClick={() => handleResultClick(result)}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 text-xs rounded ${
                      result.type === 'box' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {result.type === 'box' ? '📦 Box' : '📋 Item'}
                    </span>
                    <h3 className="font-semibold">
                      {highlightMatch(result.name, searchTerm)}
                    </h3>
                  </div>
                  
                  {result.type === 'box' ? (
                    <div className="text-sm text-gray-600">
                      <p>📍 {highlightMatch(result.location || 'No location', searchTerm)}</p>
                      <p>{highlightMatch(result.details || '', searchTerm)}</p>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">
                      <p>In box: {result.box_name}</p>
                      <p>Quantity: {result.quantity}</p>
                      {result.details && <p>{highlightMatch(result.details, searchTerm)}</p>}
                    </div>
                  )}
                </div>
              ))}
              
              {results.length === 0 && searchTerm && !loading && (
                <div className="text-center py-8 text-gray-500">
                  No results found for "{searchTerm}"
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Navigation Component
const Navigation = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [directBoxId, setDirectBoxId] = useState('');
  const navigate = useNavigate();

  const handleDirectNavigation = (e) => {
    e.preventDefault();
    if (directBoxId.trim()) {
      navigate(`/box/${directBoxId.trim()}`);
      setDirectBoxId('');
    }
  };

  return (
    <>
      <nav className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-2xl font-bold cursor-pointer" onClick={() => navigate('/')}>
            📦 Box Management System
          </h1>
          
          <div className="flex flex-col md:flex-row items-center gap-4">
            <form onSubmit={handleDirectNavigation} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Box ID..."
                value={directBoxId}
                onChange={(e) => setDirectBoxId(e.target.value)}
                className="px-3 py-1 rounded text-black"
              />
              <button type="submit" className="px-4 py-1 bg-blue-500 rounded hover:bg-blue-400">
                Go
              </button>
            </form>
            
            <button
              onClick={() => setShowGlobalSearch(true)}
              className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-400"
            >
              🔍 Global Search
            </button>
            
            <button
              onClick={() => setShowScanner(true)}
              className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-400"
            >
              📷 Scan QR
            </button>
          </div>
        </div>
      </nav>
      
      {showScanner && <QRScanner onClose={() => setShowScanner(false)} />}
      {showGlobalSearch && <GlobalSearch onClose={() => setShowGlobalSearch(false)} />}
    </>
  );
};

// Main App Component
const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navigation />
        <Routes>
          <Route path="/" element={<BoxList />} />
          <Route path="/box/:boxId" element={<BoxDetail />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;