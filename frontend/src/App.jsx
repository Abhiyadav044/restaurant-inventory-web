import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import BarcodeScannerComponent from "react-qr-barcode-scanner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";



const API_BASE = "http://127.0.0.1:8000";

const barcodeProducts = {
  "1234567890": {
    item_name: "Milk",
    category: "Dairy",
    unit: "litres",
    low_limit: 5,
  },
  "9876543210": {
    item_name: "Chicken",
    category: "Meat",
    unit: "kg",
    low_limit: 10,
  },
};

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [editId, setEditId] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [showScanner, setShowScanner] = useState(false);

  const categoryData = Object.values(
    items.reduce((acc, item) => {
      const category = item.category || "Other";

      if (!acc[category]) {
        acc[category] = {
          name: category,
         stock: 0,
        };
      }

      acc[category].stock += Number(item.quantity || 0);

      return acc;
    }, {})
  );

  const stockChartData = items.map((item) => ({
    name: item.item_name || "Unknown",
    quantity: Number(item.quantity || 0),
    low_limit: Number(item.low_limit || 0),}));

  const [form, setForm] = useState({
    item_name: "",
    category: "",
    quantity: "",
    unit: "",
    low_limit: "",
    expiry: "",
    barcode: "",
  });  

  const [saleForm, setSaleForm] = useState({
    item_name: "",
    quantity_sold: "",
    price: "",
  });


  const itemRef = useRef(null);
  const categoryRef = useRef(null);
  const quantityRef = useRef(null);
  const unitRef = useRef(null);
  const lowLimitRef = useRef(null);
  const expiryRef = useRef(null);

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";

  const chartColors = [
    "#60a5fa",
    "#34d399",
    "#fbbf24",
    "#f87171",
    "#a78bfa",
    "#22d3ee",
  ];

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      console.log(data);

      if (!res.ok) {
        alert(data.detail || "Login failed");
        return;
      }

      localStorage.setItem("token", data.access_token);

      setUser({
        username: username.trim(),
        role: "admin",
      });

    } catch (error) {
      console.error("Login error:", error);
      alert("Backend not connected");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/items`, {
        headers: {
         Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setItems(data);

      const lowStockItems = data.filter(
        (item) => Number(item.quantity) <= Number(item.low_limit)
      );

      if (lowStockItems.length > 0 && !sessionStorage.getItem("lowStockShown")) {
        alert(`Low stock alert: ${lowStockItems.length} item(s) need attention`);
        sessionStorage.setItem("lowStockShown", "yes");
      }
    } catch (error) {
      console.error("Items fetch error:", error);
    }
  };

  const fetchSales = async () => {
    try {
      const res = await fetch(`${API_BASE}/sales`);
      const data = await res.json();
      setSales(data);
    } catch (error) {
      console.error("Sales fetch error:", error);
    }
  };

  const handleAddSale = async () => {
    try {
      const total = Number(saleForm.quantity_sold) * Number(saleForm.price);

      const res = await fetch(`${API_BASE}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: saleForm.item_name,
          quantity_sold: Number(saleForm.quantity_sold),
          price: Number(saleForm.price),
          total,
          sale_date: new Date().toISOString().split("T")[0],
        }),
      });

      if (!res.ok) {
        alert("Sale add failed");
        return;
      }

      setSaleForm({
        item_name: "",
        quantity_sold: "",
        price: "",
      });

      fetchSales();
      fetchItems();
    } catch (error) {
      console.error("Sale error:", error);
      alert("Server error");
    }
  };

  const resetForm = () => {
    setForm({
      item_name: "",
      category: "",
      quantity: "",
      unit: "",
      low_limit: "",
      expiry: "",
      barcode: "",
    });
    setEditId(null);
    setTimeout(() => itemRef.current?.focus(), 100);
  };

  const handleAddItem = async () => {
    try {

      const existingItem = items.find(
        (item) =>
          item.item_name.toLowerCase().trim() ===
          form.item_name.toLowerCase().trim()
      );

      if (existingItem && !editId) {
        const updatedItem = {
          item_name: existingItem.item_name,
          category: existingItem.category,
          quantity:
            Number(existingItem.quantity) +
            Number(form.quantity),
          unit: existingItem.unit,
          low_limit: existingItem.low_limit,
          expiry: existingItem.expiry,
          barcode: existingItem.barcode,
        };

        const updateRes = await fetch(
          `${API_BASE}/items/${existingItem.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedItem),
          }
        );

        if (updateRes.ok) {
          alert("Existing item quantity updated");
          resetForm();
          fetchItems();
          return;
        }
      }

      const url = editId ? `${API_BASE}/items/${editId}` : `${API_BASE}/items`;
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: form.item_name,
          category: form.category,
          quantity: Number(form.quantity),
          unit: form.unit,
          low_limit: Number(form.low_limit),
          expiry: form.expiry,
          barcode: form.barcode,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(editId ? "Item updated" : "Item added");
        resetForm();
        fetchItems();
      } else {
        alert(data.detail || "Error");
      }
    } catch (error) {
      console.error("Item error:", error);
      alert("Server error");
    }
  };

  const deleteItem = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this item?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert("Delete failed");
        return;
      }

      fetchItems();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Server error");
    }
  };

  const handleEdit = (item) => {
    setForm({
      item_name: item.item_name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      low_limit: item.low_limit,
      expiry: item.expiry,
      barcode: item.barcode || "",
    });
    setEditId(item.id);
    setTimeout(() => itemRef.current?.focus(), 100);
  };

  const getStockStatus = (item) => {
    if (Number(item.quantity) === 0) return "Out of Stock";
    if (Number(item.quantity) <= Number(item.low_limit)) return "Low Stock";
    return "In Stock";
  };

  const getStockStatusClass = (item) => {
    if (Number(item.quantity) === 0) return "status-out";
    if (Number(item.quantity) <= Number(item.low_limit)) return "status-low";
    return "status-in";
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split("-");
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    return new Date(`${year}-${month}-${day}T00:00:00`);
  };

  const getExpiryInfo = (item) => {
    const expiryDate = parseDate(item.expiry);
    if (!expiryDate) {
      return { label: "Invalid Date", className: "status-low", daysLeft: null };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffMs = expiryDate - today;
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { label: "Expired", className: "status-out", daysLeft };
    }

    if (daysLeft <= 3) {
      return {
        label: `Expiring in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
        className: "status-low",
        daysLeft,
      };
    }

    return { label: "Fresh", className: "status-in", daysLeft };
  };

  const printReport = () => {
    window.print();
  };

  const exportCSV = () => {
    const headers = ["ID", "Name", "Category", "Quantity", "Unit", "Low Limit", "Expiry"];

    const rows = items.map((item) => [
      item.id,
      item.item_name,
      item.category,
      item.quantity,
      item.unit,
      item.low_limit,
      item.expiry,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory-report.csv";
    a.click();

    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (user) {
      fetchItems();
      fetchSales();
      setTimeout(() => itemRef.current?.focus(), 100);
    }
  }, [user]);

  const filteredItems = items.filter((item) => {
    const matchSearch = item.item_name
      ?.toLowerCase()
      .includes(search.toLowerCase());

    const matchCategory = categoryFilter
      ? item.category?.toLowerCase().includes(categoryFilter.toLowerCase())
      : true;

    let matchStock = true;

    if (stockFilter === "low") {
      matchStock =
        Number(item.quantity) <= Number(item.low_limit) &&
        Number(item.quantity) > 0;
    } else if (stockFilter === "out") {
      matchStock = Number(item.quantity) === 0;
    }

    return matchSearch && matchCategory && matchStock;
  });

  const totalItems = items.length;

  const lowStock = items.filter(
    (i) => Number(i.quantity) <= Number(i.low_limit) && Number(i.quantity) > 0
  ).length;

  const outOfStock = items.filter((i) => Number(i.quantity) === 0).length;

  const expiringSoon = items.filter((i) => {
    const info = getExpiryInfo(i);
    return info.daysLeft !== null && info.daysLeft >= 0 && info.daysLeft <= 3;
  }).length;

  const expiredItems = items.filter((i) => {
    const info = getExpiryInfo(i);
    return info.daysLeft !== null && info.daysLeft < 0;
  }).length;


  const categoryChartData = useMemo(() => {
    const grouped = {};
    items.forEach((item) => {
      const category = item.category || "Other";
      grouped[category] = (grouped[category] || 0) + Number(item.quantity);
    });

    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value,
    }));
  }, [items]);

  const expiringItemsList = items.filter((item) => {
    const info = getExpiryInfo(item);
    return info.daysLeft !== null && info.daysLeft >= 0 && info.daysLeft <= 3;
  });

  if (user) {
    return (
      <div className="page">
        <h1 className="dashboard-title">Restaurant Inventory Dashboard</h1>

        <button className="logoutBtn" onClick={logout}>
          Logout
        </button>

        <p className="dashboard-subtitle">
          Welcome, <b>{user.username}</b> ({user.role})
        </p>

        {expiringItemsList.length > 0 && (
          <div className="alert-box">
            ⚠️ {expiringItemsList.length} item
            {expiringItemsList.length !== 1 ? "s" : ""} expiring soon
          </div>
        )}

        <div className="stats-grid stats-grid-5">
          <div className="glass-card stat-card">
            <div className="stat-label">Total Items</div>
            <div className="stat-value stat-total">{totalItems}</div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-label">Low Stock</div>
            <div className="stat-value stat-low">{lowStock}</div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-label">Out of Stock</div>
            <div className="stat-value stat-out">{outOfStock}</div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-label">Expiring Soon</div>
            <div className="stat-value stat-low">{expiringSoon}</div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-label">Expired</div>
            <div className="stat-value stat-out">{expiredItems}</div>
          </div>
        </div>

        {!isManager && (
          <div className="glass-card section-card">
            <h2 className="section-title">{editId ? "Edit Product" : "Add Product"}</h2>

            <div className="form-grid">
              <input
                className="input"
                placeholder="Barcode / SKU"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />

              <button className="btn btn-blue" onClick={() => setShowScanner(true)}>
                Scan Barcode
              </button>

              <input
                ref={itemRef}
                className="input"
                placeholder="Item Name"
                value={form.item_name}
                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") categoryRef.current?.focus();
                }}
              />

              <input
                ref={categoryRef}
                className="input"
                placeholder="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") quantityRef.current?.focus();
                }}
              />

              <input
                ref={quantityRef}
                className="input"
                placeholder="Quantity"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") unitRef.current?.focus();
                }}
              />

              <input
                ref={unitRef}
                className="input"
                placeholder="Unit"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") lowLimitRef.current?.focus();
                }}
              />

              <input
                ref={lowLimitRef}
                className="input"
                placeholder="Low Limit"
                value={form.low_limit}
                onChange={(e) => setForm({ ...form, low_limit: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") expiryRef.current?.focus();
                }}
              />

              <input
                ref={expiryRef}
                className="input"
                placeholder="Expiry (DD-MM-YYYY)"
                value={form.expiry}
                onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddItem();
                }}
              />
            </div>

            {showScanner && (
              <div className="glass-card section-card">
                <h2 className="section-title">Scan Barcode</h2>

                <BarcodeScannerComponent
                  width={400}
                  height={300}
                  constraints={{ facingMode: "environment" }}
                  onUpdate={(err, result) => {
                    if (result) {
                      const scannedCode = result.text;
                      const product = barcodeProducts[scannedCode];

                      setForm({
                        ...form,
                        barcode: scannedCode,
                        item_name: product?.item_name || "",
                        category: product?.category || "",
                        unit: product?.unit || "",
                        low_limit: product?.low_limit || "",
                      });

                      setShowScanner(false);
                    }
                  }}
                />

                <button className="btn btn-red" onClick={() => setShowScanner(false)}>
                  Close Scanner
                </button>
              </div>
            )}

            <div className="actions-center">
              <button className="btn btn-green" onClick={handleAddItem}>
                {editId ? "Update Item" : "Add Item"}
              </button>

              {editId && (
                <button className="btn btn-gray" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        <div className="charts-grid">
          <div className="inventory-table-card">
            <h2 className="section-title">Inventory Items</h2>

            <div className="table-tools">
              <input
                type="text"
                placeholder="Search item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>

                {[...new Set(items.map((item) => item.category))].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Low</th>
                    <th>Expiry</th>
                  </tr>
                </thead>

                <tbody>
                  {items
                    .filter((item) =>
                      item.item_name.toLowerCase().includes(search.toLowerCase())
                    )
                    .filter((item) =>
                      categoryFilter ? item.category === categoryFilter : true
                    )
                    .map((item) => (
                      <tr key={item.id}>
                        <td>{item.item_name}</td>
                        <td>{item.category}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td>{item.low_limit}</td>
                        <td>{item.expiry}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card section-card">
            <h2 className="section-title">Category Distribution</h2>

            <div className="chart-box">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    label
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="glass-card section-card">
          <h2 className="section-title">Daily Sales Report</h2>

          <div className="form-grid">
            <input
              className="input"
              placeholder="Item Name"
              value={saleForm.item_name}
              onChange={(e) => setSaleForm({ ...saleForm, item_name: e.target.value })}
            />

            <input
              className="input"
              placeholder="Quantity Sold"
              value={saleForm.quantity_sold}
              onChange={(e) =>
                setSaleForm({ ...saleForm, quantity_sold: e.target.value })
              }
            />

            <input
              className="input"
              placeholder="Price"
              value={saleForm.price}
              onChange={(e) => setSaleForm({ ...saleForm, price: e.target.value })}
            />
          </div>

          <div className="actions-center">
            <button className="btn btn-green" onClick={handleAddSale}>
              Add Sale
            </button>
          </div>
        </div>

        <div className="glass-card section-card">
          <h2 className="section-title">Sales History</h2>

          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {sales.map((sale, index) => (
                <tr key={index}>
                  <td>{sale.sale_date}</td>
                  <td>{sale.item_name}</td>
                  <td>{sale.quantity_sold}</td>
                  <td>£{sale.price}</td>
                  <td>£{sale.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-card section-card">
          <h2 className="section-title">Inventory Items</h2>

          <div className="filter-bar">
            <input
              className="input"
              placeholder="Search item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <input
              className="input"
              placeholder="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />

            <select
              className="input"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Low Limit</th>
                  <th>Expiry</th>
                  <th>Stock</th>
                  <th>Expiry Alert</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map((item) => {
                  const expiryInfo = getExpiryInfo(item);

                  return (
                    <tr
                      key={item.id}
                      className={
                        expiryInfo.daysLeft !== null && expiryInfo.daysLeft < 0
                          ? "expired-row"
                          : expiryInfo.daysLeft !== null && expiryInfo.daysLeft <= 3
                          ? "warning-row"
                          : ""
                      }
                    >
                      <td>{item.id}</td>
                      <td>{item.item_name}</td>
                      <td>{item.category}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit}</td>
                      <td>{item.low_limit}</td>
                      <td>{item.expiry}</td>

                      <td>
                        <span className={`badge ${getStockStatusClass(item)}`}>
                          {getStockStatus(item)}
                        </span>
                      </td>

                      <td>
                        <span className={`badge ${expiryInfo.className}`}>
                          {expiryInfo.label}
                        </span>
                      </td>

                      <td>
                        {!isManager && (
                          <button
                            className="btn btn-blue"
                            onClick={() => handleEdit(item)}
                          >
                            Edit
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            className="btn btn-red"
                            onClick={() => deleteItem(item.id)}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center", padding: "18px" }}>
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="print-only">
          <h1>Restaurant Inventory Report</h1>
          <p>
            Generated by: {user.username} ({user.role})
          </p>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Low Limit</th>
                <th>Expiry</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.item_name}</td>
                  <td>{item.category}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit}</td>
                  <td>{item.low_limit}</td>
                  <td>{item.expiry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="logout-wrap">
          <button className="btn btn-blue" onClick={exportCSV}>
            Export CSV
          </button>

          <button className="btn btn-gray" onClick={printReport}>
            Print Report
          </button>

          <button className="btn btn-gray" onClick={() => setUser(null)}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="centered">
      <div className="glass-card login-box">
        <h2 className="title">Inventory Login</h2>
        <p className="subtitle">Modern restaurant stock management</p>

        <input
          className="input"
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <div style={{ height: "12px" }} />

        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleLogin();
            }
          }}
        />

        <div className="actions-center">
          <button className="btn btn-green" onClick={handleLogin}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
